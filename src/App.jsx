import { useEffect, useMemo, useState } from 'react';
import { createAiRequest, deleteLog, fetchLogs, restoreLog, updateLog } from './api';

const apiOptions = [
  { key: 'textgears', label: 'TextGears' },
  { key: 'copilot', label: 'Copilot' }
];

function App() {
  const [logs, setLogs] = useState([]);
  const [selectedApi, setSelectedApi] = useState('textgears');
  const [statusFilter, setStatusFilter] = useState('A');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingLogId, setEditingLogId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const activeApiLabel = useMemo(
    () => apiOptions.find((api) => api.key === selectedApi)?.label || selectedApi,
    [selectedApi]
  );

  function formatResponse(responseJson) {
    if (!responseJson) return '-';

    const raw = typeof responseJson === 'string' ? responseJson : JSON.stringify(responseJson);

    try {
      const parsed = typeof responseJson === 'string' ? JSON.parse(responseJson) : responseJson;

      if (parsed?.response?.corrected) return parsed.response.corrected;
      if (parsed?.response?.message) return parsed.response.message;
      if (parsed?.response?.text) return parsed.response.text;
      if (parsed?.data?.message) return parsed.data.message;
      if (parsed?.message) return parsed.message;
      if (parsed?.result) return parsed.result;
      if (parsed?.text) return parsed.text;
      if (typeof parsed === 'string') return parsed;

      return JSON.stringify(parsed);
    } catch (e) {
      return raw;
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      setError('');
      const data = await fetchLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error al cargar registros');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!query.trim()) return;

    try {
      setIsLoading(true);
      setError('');
      await createAiRequest(selectedApi, query.trim());
      setQuery('');
      await loadLogs();
    } catch (err) {
      setError(err.message || 'No se pudo crear la solicitud');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveEdit(logId) {
    if (!editingText.trim()) return;
    try {
      setIsLoading(true);
      setError('');
      await updateLog(logId, editingText.trim());
      setEditingLogId(null);
      setEditingText('');
      await loadLogs();
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el registro');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(logId) {
    if (!window.confirm('¿Eliminar este registro?')) return;
    try {
      setError('');
      setIsLoading(true);
      await deleteLog(logId);
      await loadLogs();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el registro');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRestore(logId) {
    try {
      setError('');
      setIsLoading(true);
      await restoreLog(logId);
      await loadLogs();
    } catch (err) {
      setError(err.message || 'No se pudo restaurar el registro');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="page-layout">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">AI CRUD</p>
          <h1>Panel de gestión de registros</h1>
          <p className="subtitle">
            Envía solicitudes de IA, revisa tu historial y administra registros de la base de datos.
          </p>
        </div>
      </header>

      <main className="content-grid">
        <section className="apis-selector glass-card">
          <div className="section-head">
            <div>
              <h2>APIs disponibles</h2>
              <p className="section-subtitle">Selecciona una API para ver solamente su chat.</p>
            </div>
          </div>
          <div className="api-cards-horizontal">
            {apiOptions.map((api) => (
              <button
                key={api.key}
                type="button"
                className={`api-card-btn${selectedApi === api.key ? ' active' : ''}`}
                onClick={() => setSelectedApi(api.key)}
              >
                <span>{api.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="chat-panel glass-card">
          <div className="chat-content">
              <div className="section-head">
                <div>
                  <h2>Chat IA</h2>
                  <p className="section-subtitle">Habla con la IA como en WhatsApp. El chat se filtra por API seleccionada.</p>
                </div>
                <span>API activa: {activeApiLabel}</span>
              </div>

              <div className="chat-window">
                {logs.filter((log) => log.apiName?.toLowerCase() === selectedApi.toLowerCase()).length === 0 ? (
                  <div className="chat-empty">
                    <p>Tu chat con {activeApiLabel} está vacío. Envía tu primera pregunta para comenzar.</p>
                  </div>
                ) : (
                  <div className="chat-messages">
                    {logs
                      .filter((log) => log.apiName?.toLowerCase() === selectedApi.toLowerCase())
                      .slice()
                      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                      .map((log) => (
                        <div key={log.id} className="chat-entry">
                          <div className="chat-bubble user">
                            <div className="bubble-meta">Tú · {log.apiName || 'IA'}</div>
                            <p>{log.requestText || '-'}</p>
                          </div>
                          <div className="chat-bubble assistant">
                            <div className="bubble-meta">IA responde</div>
                            <p>{formatResponse(log.responseJson)}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <form className="chat-input-panel" onSubmit={handleSubmit}>
                <label className="chat-textarea-label">
                  Escribe tu mensaje
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    rows="4"
                    placeholder="Escribe aquí y presiona enviar..."
                  />
                </label>

                <button type="submit" className="primary-btn" disabled={isLoading}>
                  {isLoading ? 'Enviando...' : 'Enviar al chat'}
                </button>
              </form>

              {error && <div className="message error">{error}</div>}
          </div>
        </section>

        <section className="history-panel glass-card">
          <div className="section-head">
            <div>
              <h2>Historial de registros - {activeApiLabel}</h2>
              <p className="section-subtitle">Actualiza o elimina registros guardados de {activeApiLabel}</p>
            </div>
          </div>

          <div className="filter-buttons">
            <button 
              className={`filter-btn ${statusFilter === 'A' ? 'active' : ''}`}
              onClick={() => setStatusFilter('A')}
            >
              Activos
            </button>
            <button 
              className={`filter-btn ${statusFilter === 'I' ? 'active' : ''}`}
              onClick={() => setStatusFilter('I')}
            >
              Inactivos
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>API</th>
                  <th>Solicitud</th>
                  <th>Respuesta</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {logs.filter((log) => log.apiName?.toLowerCase() === selectedApi.toLowerCase() && log.status === statusFilter).length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-row">
                      No hay registros {statusFilter === 'A' ? 'activos' : 'inactivos'} para {activeApiLabel}.
                    </td>
                  </tr>
                ) : (
                  logs
                    .filter((log) => log.apiName?.toLowerCase() === selectedApi.toLowerCase() && log.status === statusFilter)
                    .map((log) => (
                    <tr key={log.id}>
                      <td>{log.id}</td>
                      <td>{log.apiName || '-'}</td>
                      <td>
                        {editingLogId === log.id ? (
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            rows="3"
                          />
                        ) : (
                          <pre>{log.requestText || '-'}</pre>
                        )}
                      </td>
                      <td>
                        <pre>{formatResponse(log.responseJson)}</pre>
                      </td>
                      <td>
                        <span className={`status-pill ${log.status === 'I' ? 'inactive' : 'active'}`}>
                          {log.status === 'I' ? 'Inactivo' : 'Activo'}
                        </span>
                      </td>
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="actions-cell">
                        {editingLogId === log.id ? (
                          <>
                            <button className="action-btn save" onClick={() => handleSaveEdit(log.id)}>
                              Guardar
                            </button>
                            <button className="action-btn cancel" onClick={() => setEditingLogId(null)}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            {log.status === 'A' ? (
                              <>
                                <button
                                  className="action-btn edit"
                                  onClick={() => {
                                    setEditingLogId(log.id);
                                    setEditingText(log.requestText || '');
                                  }}
                                >
                                  Editar
                                </button>
                                <button className="action-btn delete" onClick={() => handleDelete(log.id)}>
                                  Eliminar
                                </button>
                              </>
                            ) : (
                              <button className="action-btn restore" onClick={() => handleRestore(log.id)}>
                                Restaurar
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
