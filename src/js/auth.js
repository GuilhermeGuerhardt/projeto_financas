import { api } from "./api.js";
import { hideAuthAlert, showAuthAlert, showMainAlert } from "./alerts.js";
import { clearSession, setSession } from "./session.js";
import { senhaEhForte } from "./senha.js";
import { refreshIcons } from "./utils.js";

const CONFIRMACAO_EXCLUSAO = "EXCLUIR";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const deleteModal = document.getElementById("deleteAccountModal");
const deleteConfirmInput = document.getElementById("deleteAccountConfirm");
const deleteBtn = document.getElementById("deleteAccountBtn");

function fecharDeleteModal() {
  deleteModal?.classList.replace("flex", "hidden");
}

/**
 * Liga os fluxos de autenticação. Os callbacks vêm do main.js para este módulo
 * não precisar conhecer navegação nem carregamento de dados.
 */
export function bindAuth({ aoEntrar, aoSair }) {
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAuthAlert();
    const btn = document.getElementById("loginSubmit");
    if (btn) btn.disabled = true;
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: document.getElementById("loginEmail")?.value?.trim(),
          password: document.getElementById("loginPassword")?.value,
        }),
      });
      setSession(data.token, data.user);
      await aoEntrar(data.user);
    } catch (err) {
      showAuthAlert(err.message || "Falha no login.", true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAuthAlert();

    const password = document.getElementById("regPassword")?.value;
    if (!senhaEhForte(password)) {
      showAuthAlert("A senha não atende aos requisitos de segurança.", true);
      return;
    }

    const btn = document.getElementById("registerSubmit");
    if (btn) btn.disabled = true;
    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("regName")?.value?.trim(),
          email: document.getElementById("regEmail")?.value?.trim(),
          password,
        }),
      });
      setSession(data.token, data.user);
      await aoEntrar(data.user);
    } catch (err) {
      showAuthAlert(err.message || "Não foi possível cadastrar.", true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    clearSession();
    aoSair();
  });

  bindExclusaoDeConta(aoSair);
}

function bindExclusaoDeConta(aoSair) {
  document.getElementById("deleteAccountOpenBtn")?.addEventListener("click", () => {
    if (deleteConfirmInput) deleteConfirmInput.value = "";
    if (deleteBtn) deleteBtn.disabled = true;
    deleteModal?.classList.remove("hidden");
    deleteModal?.classList.add("flex");
    refreshIcons();
  });

  document.getElementById("deleteAccountClose")?.addEventListener("click", fecharDeleteModal);
  document.getElementById("deleteAccountBackdrop")?.addEventListener("click", fecharDeleteModal);

  deleteConfirmInput?.addEventListener("input", (e) => {
    if (deleteBtn) deleteBtn.disabled = e.target.value !== CONFIRMACAO_EXCLUSAO;
  });

  deleteBtn?.addEventListener("click", async () => {
    try {
      await api("/api/auth/me", { method: "DELETE" });
      clearSession();
      fecharDeleteModal();
      aoSair();
      showAuthAlert("Conta excluída com sucesso.", false);
    } catch (err) {
      showMainAlert(err.message || "Erro ao excluir conta.", true);
    }
  });
}
