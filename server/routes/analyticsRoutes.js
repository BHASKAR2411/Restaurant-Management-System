const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const moment = require('moment');

router.get('/', auth, async (req, res) => {
  try {
    const { date, category } = req.query; // Optional: YYYY-MM-DD, category
    const restaurantId = req.user.id;

    // Validate date format
    if (date && !moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Define exists literal for filtering orders with items in the category
    const existsLiteral = category
      ? sequelize.literal(`EXISTS (
          SELECT 1
          FROM json_array_elements("items"::json) AS item
          WHERE item->>'category' = :category
        )`)
      : null;

    // Daily earnings (specific date or last 30 days)
    let dailyWhere = {
      restaurantId,
      status: { [Op.in]: ['live', 'recurring', 'past'] },
      createdAt: {
        [Op.gte]: date
          ? moment(date).startOf('day').toDate()
          : moment().subtract(30, 'days').startOf('day').toDate(),
        [Op.lte]: date
          ? moment(date).endOf('day').toDate()
          : moment().endOf('day').toDate(),
      },
    };

    if (existsLiteral) {
      dailyWhere[Op.and] = existsLiteral;
    }

    const dailyEarningsQuery = category
      ? `
        SELECT
          DATE("Order"."createdAt") AS "date",
          COALESCE(SUM(
            (elem->>'price')::numeric * (elem->>'quantity')::integer
          ), 0) AS "total"
        FROM "Orders" AS "Order"
        CROSS JOIN LATERAL json_array_elements("items") AS elem
        WHERE :existsLiteral
          AND "Order"."restaurantId" = :restaurantId
          AND "Order"."status" IN ('live', 'recurring', 'past')
          AND "Order"."createdAt" >= :startDate
          AND "Order"."createdAt" <= :endDate
          AND elem->>'category' = :category
        GROUP BY DATE("Order"."createdAt")
        ORDER BY DATE("Order"."createdAt") ASC
      `
      : `
        SELECT
          DATE("createdAt") AS "date",
          COALESCE(SUM("total"), 0) AS "total"
        FROM "Orders" AS "Order"
        WHERE "restaurantId" = :restaurantId
          AND "status" IN ('live', 'recurring', 'past')
          AND "createdAt" >= :startDate
          AND "createdAt" <= :endDate
        GROUP BY DATE("createdAt")
        ORDER BY DATE("createdAt") ASC
      `;

    const dailyEarnings = await sequelize.query(dailyEarningsQuery, {
      replacements: {
        restaurantId,
        startDate: date
          ? moment(date).startOf('day').toDate()
          : moment().subtract(30, 'days').startOf('day').toDate(),
        endDate: date
          ? moment(date).endOf('day').toDate()
          : moment().endOf('day').toDate(),
        category: category || null,
        existsLiteral: existsLiteral ? 'TRUE' : 'TRUE', // Dummy replacement to avoid null in query
      },
      type: sequelize.QueryTypes.SELECT,
    });

    // Monthly earnings (last 12 months)
    let monthlyWhere = {
      restaurantId,
      status: { [Op.in]: ['live', 'recurring', 'past'] },
      createdAt: {
        [Op.gte]: moment().subtract(12, 'months').startOf('month').toDate(),
        [Op.lte]: moment().endOf('month').toDate(),
      },
    };

    if (existsLiteral) {
      monthlyWhere[Op.and] = existsLiteral;
    }

    const monthlyEarningsQuery = category
      ? `
        SELECT
          TO_CHAR("Order"."createdAt", 'YYYY-MM') AS "month",
          COALESCE(SUM(
            (elem->>'price')::numeric * (elem->>'quantity')::integer
          ), 0) AS "total"
        FROM "Orders" AS "Order"
        CROSS JOIN LATERAL json_array_elements("items") AS elem
        WHERE :existsLiteral
          AND "Order"."restaurantId" = :restaurantId
          AND "Order"."status" IN ('live', 'recurring', 'past')
          AND "Order"."createdAt" >= :startDate
          AND "Order"."createdAt" <= :endDate
          AND elem->>'category' = :category
        GROUP BY TO_CHAR("Order"."createdAt", 'YYYY-MM')
        ORDER BY TO_CHAR("Order"."createdAt", 'YYYY-MM') ASC
      `
      : `
        SELECT
          TO_CHAR("createdAt", 'YYYY-MM') AS "month",
          COALESCE(SUM("total"), 0) AS "total"
        FROM "Orders" AS "Order"
        WHERE "restaurantId" = :restaurantId
          AND "status" IN ('live', 'recurring', 'past')
          AND "createdAt" >= :startDate
          AND "createdAt" <= :endDate
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
        ORDER BY TO_CHAR("createdAt", 'YYYY-MM') ASC
      `;

    const monthlyEarnings = await sequelize.query(monthlyEarningsQuery, {
      replacements: {
        restaurantId,
        startDate: moment().subtract(12, 'months').startOf('month').toDate(),
        endDate: moment().endOf('month').toDate(),
        category: category || null,
        existsLiteral: existsLiteral ? 'TRUE' : 'TRUE',
      },
      type: sequelize.QueryTypes.SELECT,
    });

    // Total daily earnings
    const totalDailyQuery = category
      ? `
        SELECT
          COALESCE(SUM(
            (elem->>'price')::numeric * (elem->>'quantity')::integer
          ), 0) AS "total"
        FROM "Orders" AS "Order"
        CROSS JOIN LATERAL json_array_elements("items") AS elem
        WHERE :existsLiteral
          AND "Order"."restaurantId" = :restaurantId
          AND "Order"."status" IN ('live', 'recurring', 'past')
          AND "Order"."createdAt" >= :startDate
          AND "Order"."createdAt" <= :endDate
          AND elem->>'category' = :category
      `
      : `
        SELECT
          COALESCE(SUM("total"), 0) AS "total"
        FROM "Orders" AS "Order"
        WHERE "restaurantId" = :restaurantId
          AND "status" IN ('live', 'recurring', 'past')
          AND "createdAt" >= :startDate
          AND "createdAt" <= :endDate
      `;

    const totalDailyResult = await sequelize.query(totalDailyQuery, {
      replacements: {
        restaurantId,
        startDate: date
          ? moment(date).startOf('day').toDate()
          : moment().subtract(30, 'days').startOf('day').toDate(),
        endDate: date
          ? moment(date).endOf('day').toDate()
          : moment().endOf('day').toDate(),
        category: category || null,
        existsLiteral: existsLiteral ? 'TRUE' : 'TRUE',
      },
      type: sequelize.QueryTypes.SELECT,
    });
    const totalDaily = parseFloat(totalDailyResult[0]?.total || 0);

    // Total monthly earnings (current month)
    const totalMonthlyQuery = category
      ? `
        SELECT
          COALESCE(SUM(
            (elem->>'price')::numeric * (elem->>'quantity')::integer
          ), 0) AS "total"
        FROM "Orders" AS "Order"
        CROSS JOIN LATERAL json_array_elements("items") AS elem
        WHERE :existsLiteral
          AND "Order"."restaurantId" = :restaurantId
          AND "Order"."status" IN ('live', 'recurring', 'past')
          AND "Order"."createdAt" >= :startMonth
          AND "Order"."createdAt" <= :endMonth
          AND elem->>'category' = :category
      `
      : `
        SELECT
          COALESCE(SUM("total"), 0) AS "total"
        FROM "Orders" AS "Order"
        WHERE "restaurantId" = :restaurantId
          AND "status" IN ('live', 'recurring', 'past')
          AND "createdAt" >= :startMonth
          AND "createdAt" <= :endMonth
      `;

    const totalMonthlyResult = await sequelize.query(totalMonthlyQuery, {
      replacements: {
        restaurantId,
        startMonth: moment().startOf('month').toDate(),
        endMonth: moment().endOf('month').toDate(),
        category: category || null,
        existsLiteral: existsLiteral ? 'TRUE' : 'TRUE',
      },
      type: sequelize.QueryTypes.SELECT,
    });
    const totalMonthly = parseFloat(totalMonthlyResult[0]?.total || 0);

    // Daily and monthly order counts
    const dailyOrderCount = await Order.count({ where: dailyWhere });
    const monthlyOrderCount = await Order.count({
      where: {
        restaurantId,
        status: { [Op.in]: ['live', 'recurring', 'past'] },
        createdAt: {
          [Op.gte]: moment().startOf('month').toDate(),
          [Op.lte]: moment().endOf('month').toDate(),
        },
        ...(existsLiteral ? { [Op.and]: existsLiteral } : {}),
      },
    });

    res.json({
      dailyEarnings: dailyEarnings.map((e) => ({
        date: e.date,
        total: parseFloat(e.total || 0),
      })),
      monthlyEarnings: monthlyEarnings.map((e) => ({
        month: e.month,
        total: parseFloat(e.total || 0),
      })),
      totalDaily,
      totalMonthly,
      dailyOrderCount: dailyOrderCount || 0,
      monthlyOrderCount: monthlyOrderCount || 0,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;