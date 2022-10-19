function formatMessage(id, msg) {
  return {
    id,
    ConfirmationId,
    amount,
    username,
    err,
    status,
    sender,
    body,
    timestamp,
  } = msg;
}

module.exports = formatMessage;
