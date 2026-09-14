export function shouldApplySentenceOperationResponse({
  activeProjectId,
  currentOperationToken,
  operationProjectId,
  operationToken
}) {
  return (
    currentOperationToken === operationToken &&
    Boolean(operationProjectId) &&
    activeProjectId === operationProjectId
  );
}

export function shouldShowSentenceOperationError({
  activeProjectId,
  currentOperationToken,
  operationProjectId,
  operationToken
}) {
  return (
    currentOperationToken === operationToken &&
    (!operationProjectId || activeProjectId === operationProjectId)
  );
}
