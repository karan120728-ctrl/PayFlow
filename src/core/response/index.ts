export const successResponse = (data: any, message: string = "Success") => {
  return {
    success: true,
    data,
    message
  };
};

export const errorResponse = (message: string, data: any = null) => {
  return {
    success: false,
    data,
    message
  };
};
