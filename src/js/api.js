import { API_BASE } from "./config.js";
import { getToken } from "./session.js";

const ERRO_API_OFFLINE =
  "API não encontrada. Rode npm start na pasta do projeto e use a mesma porta (ex.: abra http://localhost:3000). Se a porta 3000 estiver com outro app, encerre-o ou defina PORT.";

function mensagemDeErro(res, data) {
  if (res.status === 404) {
    const erro = typeof data.erro === "string" ? data.erro : "";
    if (erro.toLowerCase().includes("rota não encontrada")) {
      return `${erro} Verifique se o servidor deste projeto está ativo e atualizado (reinicie após git pull).`;
    }
    return erro || ERRO_API_OFFLINE;
  }
  return data.erro || res.statusText || "Erro na requisição";
}

export async function api(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();

  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { erro: res.ok ? "" : "Resposta inválida do servidor (não é JSON)." };
    }
  }

  if (!res.ok) {
    const err = new Error(mensagemDeErro(res, data));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
