const baseUrl = '/api';

export async function fetchLogs() {
  const response = await fetch(`${baseUrl}/logs`);
  if (!response.ok) throw new Error('No se pudieron cargar los registros');
  return response.json();
}

export async function createAiRequest(apiName, text) {
  const response = await fetch(`${baseUrl}/${apiName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!response.ok) throw new Error('Error al enviar la solicitud AI');
  return response.text();
}

export async function updateLog(id, requestText) {
  const response = await fetch(`${baseUrl}/logs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestText })
  });
  if (!response.ok) throw new Error('Error al actualizar el registro');
  return response.json();
}

export async function deleteLog(id) {
  const response = await fetch(`${baseUrl}/logs/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Error al eliminar el registro');
  return response;
}

export async function restoreLog(id) {
  const response = await fetch(`${baseUrl}/logs/${id}/restore`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Error al restaurar el registro');
  return response.json();
}
