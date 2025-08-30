export const setTableData = (tableNo, restaurantId) => {
  localStorage.setItem('tableNo', tableNo);
  localStorage.setItem('restaurantId', Number(restaurantId)); // Convert to number
};

export const getTableData = () => {
  const restaurantId = localStorage.getItem('restaurantId');
  return {
    tableNo: localStorage.getItem('tableNo'),
    restaurantId: restaurantId ? Number(restaurantId) : null, // Convert to number
  };
};

export const clearTableData = () => {
  localStorage.removeItem('tableNo');
  localStorage.removeItem('restaurantId');
};