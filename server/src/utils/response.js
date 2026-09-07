module.exports = {
  ok(res, data, statusCode = 200) {
    return res.status(statusCode).json({ success: true, data });
  },
  created(res, data) {
    return this.ok(res, data, 201);
  },
};
