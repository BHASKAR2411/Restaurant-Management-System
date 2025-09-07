const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const moment = require('moment');

router.get('/', auth, async (req, res) => {
  try {
    let { year, month, day, category } = req.query;
    const restaurantId = req.user.id;

    // Normalize inputs
    year = year ? String(year).trim() : '';
    month = month ? String(month).padStart(2, '0') : '';
    day = day ? String(day).padStart(2, '0') : '';
    category = category ? decodeURIComponent(String(category).trim()) : '';

    // Validate inputs
    if (year && !/^\d{4}$/.test(year)) {
      return res.status(400).json({ error: 'Invalid year format. Use YYYY' });
    }
    if (month && !/^(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ error: 'Invalid month format. Use MM' });
    }
    if (day && !/^(0[1-9]|[12]\d|3[01])$/.test(day)) {
      return res.status(400).json({ error: 'Invalid day format. Use DD' });
    }

    console.log('Query params:', { year, month, day, category });

    // Determine date range based on filters
    let startDate, endDate;
    if (year && month && day) {
      const dateStr = `${year}-${month}-${day}`;
      if (!moment(dateStr, 'YYYY-MM-DD', true).isValid()) {
        console.log('Invalid date:', dateStr);
        return res.json({
          totalPrimary: 0,
          totalSecondary: 0,
          primaryDate: null,
          orderPrimary: 0,
          orderPrimaryDate: null,
          orderSecondary: 0,
          earningsByDate: [],
          earningsByMonth: [],
          earningsByCategory: [],
        });
      }
      startDate = moment(dateStr).startOf('day').toDate();
      endDate = moment(dateStr).endOf('day').toDate();
    } else if (year && month) {
      const dateStr = `${year}-${month}`;
      if (!moment(dateStr, 'YYYY-MM', true).isValid()) {
        console.log('Invalid year-month:', dateStr);
        return res.status(400).json({ error: 'Invalid year-month' });
      }
      startDate = moment(dateStr).startOf('month').toDate();
      endDate = moment(dateStr).endOf('month').toDate();
    } else if (year) {
      startDate = moment(`${year}-01-01`).startOf('year').toDate();
      endDate = moment(`${year}-12-31`).endOf('year').toDate();
    } else {
      startDate = moment().subtract(30, 'days').startOf('day').toDate();
      endDate = moment().endOf('day').toDate();
    }

    console.log('Date range:', { startDate, endDate });

    // Base where clause for order counts
    let where = {
      restaurantId,
      status: { [Op.in]: ['live', 'recurring', 'past'] },
      createdAt: {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      },
    };

    // Add category filter for order counts if category is provided
    if (category) {
      where[Op.and] = sequelize.literal(`EXISTS (
        SELECT 1
        FROM json_array_elements("items"::json) AS item
        WHERE LOWER(item->>'category') = LOWER(:category)
      )`);
    }

    // Initialize response fields
    let earningsByDate = [];
    let earningsByMonth = [];
    let totalPrimary = 0;
    let primaryDate = null;
    let totalSecondary = 0;
    let orderPrimary = 0;
    let orderPrimaryDate = null;
    let orderSecondary = 0;
    let earningsByCategory = [];

    try {
      if (year && month && day) {
        // Day mode: Earnings and orders for specific day
        const dailyEarningsQuery = `
          SELECT
            COALESCE(SUM(
              (elem->>'price')::numeric * (elem->>'quantity')::integer
            ), 0) AS "total"
          FROM "Orders" AS "Order"
          CROSS JOIN LATERAL json_array_elements("items"::json) AS elem
          WHERE "Order"."restaurantId" = :restaurantId
            AND "Order"."status" IN ('live', 'recurring', 'past')
            AND "Order"."createdAt" >= :startDate
            AND "Order"."createdAt" <= :endDate
            ${category ? 'AND LOWER(elem->>\'category\') = LOWER(:category)' : ''}
        `;

        console.log('Executing dailyEarningsQuery with replacements:', {
          restaurantId,
          startDate,
          endDate,
          category,
        });

        const dailyResult = await sequelize.query(dailyEarningsQuery, {
          replacements: { restaurantId, startDate, endDate, category },
          type: sequelize.QueryTypes.SELECT,
        });
        totalPrimary = parseFloat(dailyResult[0]?.total || 0);

        orderPrimary = await Order.count({
          where,
          replacements: category ? { category } : undefined,
        });

        // Category earnings
        const categoryQuery = `
          SELECT
            elem->>'category' AS "category",
            COALESCE(SUM(
              (elem->>'price')::numeric * (elem->>'quantity')::integer
            ), 0) AS "total"
          FROM "Orders" AS "Order"
          CROSS JOIN LATERAL json_array_elements("items"::json) AS elem
          WHERE "Order"."restaurantId" = :restaurantId
            AND "Order"."status" IN ('live', 'recurring', 'past')
            AND "Order"."createdAt" >= :startDate
            AND "Order"."createdAt" <= :endDate
            ${category ? 'AND LOWER(elem->>\'category\') = LOWER(:category)' : ''}
          GROUP BY elem->>'category'
        `;
        console.log('Executing categoryQuery with replacements:', { restaurantId, startDate, endDate, category });
        earningsByCategory = await sequelize.query(categoryQuery, {
          replacements: { restaurantId, startDate, endDate, category },
          type: sequelize.QueryTypes.SELECT,
        });
        earningsByCategory = earningsByCategory.map(e => ({
          category: e.category,
          total: parseFloat(e.total || 0),
        }));
      } else if (year && month) {
        // Month mode: Max daily earnings/orders, total monthly earnings/orders
        const dailyEarningsQuery = `
          SELECT
            DATE("Order"."createdAt") AS "date",
            COALESCE(SUM(
              (elem->>'price')::numeric * (elem->>'quantity')::integer
            ), 0) AS "total"
          FROM "Orders" AS "Order"
          CROSS JOIN LATERAL json_array_elements("items"::json) AS elem
          WHERE "Order"."restaurantId" = :restaurantId
            AND "Order"."status" IN ('live', 'recurring', 'past')
            AND "Order"."createdAt" >= :startDate
            AND "Order"."createdAt" <= :endDate
            ${category ? 'AND LOWER(elem->>\'category\') = LOWER(:category)' : ''}
          GROUP BY DATE("Order"."createdAt")
          ORDER BY "total" DESC
          LIMIT 1
        `;

        console.log('Executing dailyEarningsQuery with replacements:', {
          restaurantId,
          startDate,
          endDate,
          category,
        });

        const maxDailyEarnings = await sequelize.query(dailyEarningsQuery, {
          replacements: { restaurantId, startDate, endDate, category },
          type: sequelize.QueryTypes.SELECT,
        });
        totalPrimary = parseFloat(maxDailyEarnings[0]?.total || 0);
        primaryDate = maxDailyEarnings[0]?.date || null;

        const totalMonthlyQuery = `
          SELECT
            COALESCE(SUM(
              (elem->>'price')::numeric * (elem->>'quantity')::integer
            ), 0) AS "total"
          FROM "Orders" AS "Order"
          CROSS JOIN LATERAL json_array_elements("items"::json) AS elem
          WHERE "Order"."restaurantId" = :restaurantId
            AND "Order"."status" IN ('live', 'recurring', 'past')
            AND "Order"."createdAt" >= :startDate
            AND "Order"."createdAt" <= :endDate
            ${category ? 'AND LOWER(elem->>\'category\') = LOWER(:category)' : ''}
        `;
        console.log('Executing totalMonthlyQuery with replacements:', {
          restaurantId,
          startDate,
          endDate,
          category,
        });
        const totalMonthlyResult = await sequelize.query(totalMonthlyQuery, {
          replacements: { restaurantId, startDate, endDate, category },
          type: sequelize.QueryTypes.SELECT,
        });
        totalSecondary = parseFloat(totalMonthlyResult[0]?.total || 0);

        const dailyOrderQuery = `
          SELECT
            DATE("createdAt") AS "date",
            COUNT(*) AS "count"
          FROM "Orders" AS "Order"
          WHERE "restaurantId" = :restaurantId
            AND "status" IN ('live', 'recurring', 'past')
            AND "createdAt" >= :startDate
            AND "createdAt" <= :endDate
            ${category ? 'AND EXISTS (SELECT 1 FROM json_array_elements("items"::json) AS item WHERE LOWER(item->>\'category\') = LOWER(:category))' : ''}
          GROUP BY DATE("createdAt")
          ORDER BY "count" DESC
          LIMIT 1
        `;
        console.log('Executing dailyOrderQuery with replacements:', {
          restaurantId,
          startDate,
          endDate,
          category,
        });
        const maxDailyOrders = await sequelize.query(dailyOrderQuery, {
          replacements: { restaurantId, startDate, endDate, category },
          type: sequelize.QueryTypes.SELECT,
        });
        orderPrimary = parseInt(maxDailyOrders[0]?.count || 0);
        orderPrimaryDate = maxDailyOrders[0]?.date || null;

        orderSecondary = await Order.count({
          where,
          replacements: category ? { category } : undefined,
        });

        earningsByDate = await sequelize.query(
          `
            SELECT
              DATE("Order"."createdAt") AS "date",
              COALESCE(SUM(
                (elem->>'price')::numeric * (elem->>'quantity')::integer
              ), 0) AS "total"
            FROM "Orders" AS "Order"
            CROSS JOIN LATERAL json_array_elements("items"::json) AS elem
            WHERE "Order"."restaurantId" = :restaurantId
              AND "Order"."status" IN ('live', 'recurring', 'past')
              AND "Order"."createdAt" >= :startDate
              AND "Order"."createdAt" <= :endDate
              ${category ? 'AND LOWER(elem->>\'category\') = LOWER(:category)' : ''}
            GROUP BY DATE("Order"."createdAt")
            ORDER BY DATE("Order"."createdAt") ASC
          `,
          {
            replacements: { restaurantId, startDate, endDate, category },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        earningsByDate = earningsByDate.map(e => ({ date: e.date, total: parseFloat(e.total || 0) }));

        const categoryQuery = `
          SELECT
            elem->>'category' AS "category",
            COALESCE(SUM(
              (elem->>'price')::numeric * (elem->>'quantity')::integer
            ), 0) AS "total"
          FROM "Orders" AS "Order"
          CROSS JOIN LATERAL json_array_elements("items"::json) AS elem
          WHERE "Order"."restaurantId" = :restaurantId
            AND "Order"."status" IN ('live', 'recurring', 'past')
            AND "Order"."createdAt" >= :startDate
            AND "Order"."createdAt" <= :endDate
            ${category ? 'AND LOWER(elem->>\'category\') = LOWER(:category)' : ''}
          GROUP BY elem->>'category'
        `;
        console.log('Executing categoryQuery with replacements:', { restaurantId, startDate, endDate, category });
        earningsByCategory = await sequelize.query(categoryQuery, {
          replacements: { restaurantId, startDate, endDate, category },
          type: sequelize.QueryTypes.SELECT,
        });
        earningsByCategory = earningsByCategory.map(e => ({
          category: e.category,
          total: parseFloat(e.total || 0),
        }));
      } else if (year) {
        // Year mode: Max daily earnings/orders, total yearly earnings/orders
        const dailyEarningsQuery = `
          SELECT
            DATE("Order"."createdAt") AS "date",
            COALESCE(SUM(
              (elem->>'price')::numeric * (elem->>'quantity')::integer
            ), 0) AS "total"
          FROM "Orders" AS "Order"
          CROSS JOIN LATERAL json_array_elements("items"::json) AS elem
          WHERE "Order"."restaurantId" = :restaurantId
            AND "Order"."status" IN ('live', 'recurring', 'past')
            AND "Order"."createdAt" >= :startDate
            AND "Order"."createdAt" <= :endDate
            ${category ? 'AND LOWER(elem->>\'category\') = LOWER(:category)' : ''}
          GROUP BY DATE("Order"."createdAt")
          ORDER BY "total" DESC
          LIMIT 1
        `;
        console.log('Executing dailyEarningsQuery with replacements:', {
          restaurantId,
          startDate,
          endDate,
          category,
        });
        const maxDailyEarnings = await sequelize.query(dailyEarningsQuery, {
          replacements: { restaurantId, startDate, endDate, category },
          type: sequelize.QueryTypes.SELECT,
        });
        totalPrimary = parseFloat(maxDailyEarnings[0]?.total || 0);
        primaryDate = maxDailyEarnings[0]?.date || null;

        const totalYearlyQuery = `
          SELECT
            COALESCE(SUM(
              (elem->>'price')::numeric * (elem->>'quantity')::integer
            ), 0) AS "total"
          FROM "Orders" AS "Order"
          CROSS JOIN LATERAL json_array_elements("items"::json) AS elem
          WHERE "Order"."restaurantId" = :restaurantId
            AND "Order"."status" IN ('live', 'recurring', 'past')
            AND "Order"."createdAt" >= :startDate
            AND "Order"."createdAt" <= :endDate
            ${category ? 'AND LOWER(elem->>\'category\') = LOWER(:category)' : ''}
        `;
        console.log('Executing totalYearlyQuery with replacements:', {
          restaurantId,
          startDate,
          endDate,
          category,
        });
        const totalYearlyResult = await sequelize.query(totalYearlyQuery, {
          replacements: { restaurantId, startDate, endDate, category },
          type: sequelize.QueryTypes.SELECT,
        });
        totalSecondary = parseFloat(totalYearlyResult[0]?.total || 0);

        const dailyOrderQuery = `
          SELECT
            DATE("createdAt") AS "date",
            COUNT(*) AS "count"
          FROM "Orders" AS "Order"
          WHERE "restaurantId" = :restaurantId
            AND "status" IN ('live', 'recurring', 'past')
            AND "createdAt" >= :startDate
            AND "createdAt" <= :endDate
            ${category ? 'AND EXISTS (SELECT 1 FROM json_array_elements("items"::json) AS item WHERE LOWER(item->>\'category\') = LOWER(:category))' : ''}
          GROUP BY DATE("createdAt")
          ORDER BY "count" DESC
          LIMIT 1
        `;
        console.log('Executing dailyOrderQuery with replacements:', {
          restaurantId,
          startDate,
          endDate,
          category,
        });
        const maxDailyOrders = await sequelize.query(dailyOrderQuery, {
          replacements: { restaurantId, startDate, endDate, category },
          type: sequelize.QueryTypes.SELECT,
        });
        orderPrimary = parseInt(maxDailyOrders[0]?.count || 0);
        orderPrimaryDate = maxDailyOrders[0]?.date || null;

        orderSecondary = await Order.count({
          where,
          replacements: category ? { category } : undefined,
        });

        earningsByDate = await sequelize.query(
          `
            SELECT
              DATE("Order"."createdAt") AS "date",
              COALESCE(SUM(
                (elem->>'price')::numeric * (elem->>'quantity')::integer
              ), 0) AS "total"
            FROM "Orders" AS "Order"
            CROSS JOIN LATERAL json_array_elements("items"::json) AS elem
            WHERE "Order"."restaurantId" = :restaurantId
              AND "Order"."status" IN ('live', 'recurring', 'past')
              AND "Order"."createdAt" >= :startDate
              AND "Order"."createdAt" <= :endDate
              ${category ? 'AND LOWER(elem->>\'category\') = LOWER(:category)' : ''}
            GROUP BY DATE("Order"."createdAt")
            ORDER BY DATE("Order"."createdAt") ASC
          `,
          {
            replacements: { restaurantId, startDate, endDate, category },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        earningsByDate = earningsByDate.map(e => ({ date: e.date, total: parseFloat(e.total || 0) }));

        earningsByMonth = await sequelize.query(
          `
            SELECT
              TO_CHAR("Order"."createdAt", 'YYYY-MM') AS "month",
              COALESCE(SUM(
                (elem->>'price')::numeric * (elem->>'quantity')::integer
              ), 0) AS "total"
            FROM "Orders" AS "Order"
            CROSS JOIN LATERAL json_array_elements("items"::json) AS elem
            WHERE "Order"."restaurantId" = :restaurantId
              AND "Order"."status" IN ('live', 'recurring', 'past')
              AND "Order"."createdAt" >= :startDate
              AND "Order"."createdAt" <= :endDate
              ${category ? 'AND LOWER(elem->>\'category\') = LOWER(:category)' : ''}
            GROUP BY TO_CHAR("Order"."createdAt", 'YYYY-MM')
            ORDER BY TO_CHAR("Order"."createdAt", 'YYYY-MM') ASC
          `,
          {
            replacements: { restaurantId, startDate, endDate, category },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        earningsByMonth = earningsByMonth.map(e => ({ month: e.month, total: parseFloat(e.total || 0) }));

        const categoryQuery = `
          SELECT
            elem->>'category' AS "category",
            COALESCE(SUM(
              (elem->>'price')::numeric * (elem->>'quantity')::integer
            ), 0) AS "total"
          FROM "Orders" AS "Order"
          CROSS JOIN LATERAL json_array_elements("items"::json) AS elem
          WHERE "Order"."restaurantId" = :restaurantId
            AND "Order"."status" IN ('live', 'recurring', 'past')
            AND "Order"."createdAt" >= :startDate
            AND "Order"."createdAt" <= :endDate
            ${category ? 'AND LOWER(elem->>\'category\') = LOWER(:category)' : ''}
          GROUP BY elem->>'category'
        `;
        console.log('Executing categoryQuery with replacements:', { restaurantId, startDate, endDate, category });
        earningsByCategory = await sequelize.query(categoryQuery, {
          replacements: { restaurantId, startDate, endDate, category },
          type: sequelize.QueryTypes.SELECT,
        });
        earningsByCategory = earningsByCategory.map(e => ({
          category: e.category,
          total: parseFloat(e.total || 0),
        }));
      } else {
        // Default mode: Last 30 days for daily, 12 months for monthly
        earningsByDate = await sequelize.query(
          `
            SELECT
              DATE("Order"."createdAt") AS "date",
              COALESCE(SUM(
                (elem->>'price')::numeric * (elem->>'quantity')::integer
              ), 0) AS "total"
            FROM "Orders" AS "Order"
            CROSS JOIN LATERAL json_array_elements("items"::json) AS elem
            WHERE "Order"."restaurantId" = :restaurantId
              AND "Order"."status" IN ('live', 'recurring', 'past')
              AND "Order"."createdAt" >= :startDate
              AND "Order"."createdAt" <= :endDate
              ${category ? 'AND LOWER(elem->>\'category\') = LOWER(:category)' : ''}
            GROUP BY DATE("Order"."createdAt")
            ORDER BY DATE("Order"."createdAt") ASC
          `,
          {
            replacements: { restaurantId, startDate, endDate, category },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        earningsByDate = earningsByDate.map(e => ({ date: e.date, total: parseFloat(e.total || 0) }));

        earningsByMonth = await sequelize.query(
          `
            SELECT
              TO_CHAR("Order"."createdAt", 'YYYY-MM') AS "month",
              COALESCE(SUM(
                (elem->>'price')::numeric * (elem->>'quantity')::integer
              ), 0) AS "total"
            FROM "Orders" AS "Order"
            CROSS JOIN LATERAL json_array_elements("items"::json) AS elem
            WHERE "Order"."restaurantId" = :restaurantId
              AND "Order"."status" IN ('live', 'recurring', 'past')
              AND "Order"."createdAt" >= :startMonth
              AND "Order"."createdAt" <= :endMonth
              ${category ? 'AND LOWER(elem->>\'category\') = LOWER(:category)' : ''}
            GROUP BY TO_CHAR("Order"."createdAt", 'YYYY-MM')
            ORDER BY TO_CHAR("Order"."createdAt", 'YYYY-MM') ASC
          `,
          {
            replacements: {
              restaurantId,
              startMonth: moment().subtract(12, 'months').startOf('month').toDate(),
              endMonth: moment().endOf('month').toDate(),
              category,
            },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        earningsByMonth = earningsByMonth.map(e => ({ month: e.month, total: parseFloat(e.total || 0) }));

        const dailyEarningsQuery = `
          SELECT
            COALESCE(SUM(
              (elem->>'price')::numeric * (elem->>'quantity')::integer
            ), 0) AS "total"
          FROM "Orders" AS "Order"
          CROSS JOIN LATERAL json_array_elements("items"::json) AS elem
          WHERE "Order"."restaurantId" = :restaurantId
            AND "Order"."status" IN ('live', 'recurring', 'past')
            AND "Order"."createdAt" >= :startDate
            AND "Order"."createdAt" <= :endDate
            ${category ? 'AND LOWER(elem->>\'category\') = LOWER(:category)' : ''}
        `;
        console.log('Executing dailyEarningsQuery with replacements:', {
          restaurantId,
          startDate,
          endDate,
          category,
        });
        const dailyResult = await sequelize.query(dailyEarningsQuery, {
          replacements: { restaurantId, startDate, endDate, category },
          type: sequelize.QueryTypes.SELECT,
        });
        totalPrimary = parseFloat(dailyResult[0]?.total || 0);

        const monthlyResult = await sequelize.query(
          `
            SELECT
              COALESCE(SUM(
                (elem->>'price')::numeric * (elem->>'quantity')::integer
              ), 0) AS "total"
            FROM "Orders" AS "Order"
            CROSS JOIN LATERAL json_array_elements("items"::json) AS elem
            WHERE "Order"."restaurantId" = :restaurantId
              AND "Order"."status" IN ('live', 'recurring', 'past')
              AND "Order"."createdAt" >= :startMonth
              AND "Order"."createdAt" <= :endMonth
              ${category ? 'AND LOWER(elem->>\'category\') = LOWER(:category)' : ''}
          `,
          {
            replacements: {
              restaurantId,
              startMonth: moment().subtract(12, 'months').startOf('month').toDate(),
              endMonth: moment().endOf('month').toDate(),
              category,
            },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        totalSecondary = parseFloat(monthlyResult[0]?.total || 0);

        orderPrimary = await Order.count({
          where,
          replacements: category ? { category } : undefined,
        });

        orderSecondary = await Order.count({
          where: {
            restaurantId,
            status: { [Op.in]: ['live', 'recurring', 'past'] },
            createdAt: {
              [Op.gte]: moment().subtract(12, 'months').startOf('month').toDate(),
              [Op.lte]: moment().endOf('month').toDate(),
            },
            ...(category ? {
              [Op.and]: sequelize.literal(`EXISTS (
                SELECT 1
                FROM json_array_elements("items"::json) AS item
                WHERE LOWER(item->>'category') = LOWER(:category)
              )`),
            } : {}),
          },
          replacements: category ? { category } : undefined,
        });

        const categoryQuery = `
          SELECT
            elem->>'category' AS "category",
            COALESCE(SUM(
              (elem->>'price')::numeric * (elem->>'quantity')::integer
            ), 0) AS "total"
          FROM "Orders" AS "Order"
          CROSS JOIN LATERAL json_array_elements("items"::json) AS elem
          WHERE "Order"."restaurantId" = :restaurantId
            AND "Order"."status" IN ('live', 'recurring', 'past')
            AND "Order"."createdAt" >= :startDate
            AND "Order"."createdAt" <= :endDate
            ${category ? 'AND LOWER(elem->>\'category\') = LOWER(:category)' : ''}
          GROUP BY elem->>'category'
        `;
        console.log('Executing categoryQuery with replacements:', { restaurantId, startDate, endDate, category });
        earningsByCategory = await sequelize.query(categoryQuery, {
          replacements: { restaurantId, startDate, endDate, category },
          type: sequelize.QueryTypes.SELECT,
        });
        earningsByCategory = earningsByCategory.map(e => ({
          category: e.category,
          total: parseFloat(e.total || 0),
        }));
      }
    } catch (queryError) {
      console.error('Query error:', queryError.message, queryError.stack);
      throw new Error(`Database query failed: ${queryError.message}`);
    }

    console.log('Response data:', {
      totalPrimary,
      totalSecondary,
      primaryDate,
      orderPrimary,
      orderPrimaryDate,
      orderSecondary,
      earningsByDate,
      earningsByMonth,
      earningsByCategory,
    });

    res.json({
      totalPrimary,
      totalSecondary,
      primaryDate,
      orderPrimary,
      orderPrimaryDate,
      orderSecondary,
      earningsByDate,
      earningsByMonth,
      earningsByCategory,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error.message, error.stack);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;