import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const loginForm = document.getElementById("loginForm");
const cadastroForm = document.getElementById("cadastroForm");

const mensagemLogin = document.getElementById("mensagemLogin");
const mensagemCadastro = document.getElementById("mensagemCadastro");

const telaLogin = document.getElementById("telaLogin");
const telaCadastro = document.getElementById("telaCadastro");

const mostrarCadastro = document.getElementById("mostrarCadastro");
const mostrarLogin = document.getElementById("mostrarLogin");

function normalizarCNPJ(cnpj) {
    return String(cnpj || "").replace(/\D/g, "");
}

mostrarCadastro.addEventListener("click", () => {
    telaLogin.style.display = "none";
    telaCadastro.style.display = "block";
    limparMensagens();
});

mostrarLogin.addEventListener("click", () => {
    telaCadastro.style.display = "none";
    telaLogin.style.display = "block";
    limparMensagens();
});

function limparMensagens() {
    mensagemLogin.textContent = "";
    mensagemCadastro.textContent = "";
    mensagemLogin.className = "mensagem";
    mensagemCadastro.className = "mensagem";
}

function mostrarMensagem(elemento, texto, tipo) {
    elemento.textContent = texto;
    elemento.className = `mensagem ${tipo}`;
}

cadastroForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome = document.getElementById("cadastroNome").value.trim();
    const cnpj = normalizarCNPJ(
    document.getElementById("cadastroCnpj").value
);
    const cep = document.getElementById("cadastroCep").value.trim();
    const email = document.getElementById("cadastroEmail").value.trim();
    const senha = document.getElementById("cadastroSenha").value;

    if (!nome || !cnpj || !cep || !email || !senha) {
        mostrarMensagem(
            mensagemCadastro,
            "Preencha todos os campos.",
            "erro"
        );
        return;
    }

    if (senha.length < 6) {
        mostrarMensagem(
            mensagemCadastro,
            "A senha precisa ter pelo menos 6 caracteres.",
            "erro"
        );
        return;
    }

    try {
        mostrarMensagem(
            mensagemCadastro,
            "Criando sua conta...",
            "info"
        );

        const credencial = await createUserWithEmailAndPassword(
            auth,
            email,
            senha
        );

        const usuario = credencial.user;

        await updateProfile(usuario, {
            displayName: nome
        });

        await setDoc(doc(db, "empresas", usuario.uid), {
            uid: usuario.uid,
            nomeEmpresa: nome,
            cnpj: cnpj,
            cep: cep,
            email: email,
            criadoEm: new Date()
        });

        localStorage.setItem(
            "currentUser",
            JSON.stringify({
                uid: usuario.uid,
                name: nome,
                cnpj: cnpj,
                email: email
            })
        );

        mostrarMensagem(
            mensagemCadastro,
            "Cadastro realizado com sucesso!",
            "sucesso"
        );

        setTimeout(() => {
            window.location.href = "../index.html";
        }, 1000);

    } catch (error) {
        console.error(error);

        let mensagem = "Não foi possível realizar o cadastro.";

        if (error.code === "auth/email-already-in-use") {
            mensagem = "Este e-mail já está cadastrado.";
        } else if (error.code === "auth/invalid-email") {
            mensagem = "Digite um e-mail válido.";
        } else if (error.code === "auth/weak-password") {
            mensagem = "A senha é muito fraca.";
        } else if (error.code === "permission-denied") {
            mensagem = "O Firebase bloqueou o cadastro. Verifique as regras do Firestore.";
        }

        mostrarMensagem(
            mensagemCadastro,
            mensagem,
            "erro"
        );
    }
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const senha = document.getElementById("loginSenha").value;

    if (!email || !senha) {
        mostrarMensagem(
            mensagemLogin,
            "Digite seu e-mail e sua senha.",
            "erro"
        );
        return;
    }

    try {
        mostrarMensagem(
            mensagemLogin,
            "Entrando...",
            "info"
        );

        const credencial = await signInWithEmailAndPassword(
            auth,
            email,
            senha
        );

        const usuario = credencial.user;

        const empresaRef = doc(db, "empresas", usuario.uid);
        const empresaSnap = await getDoc(empresaRef);

        let nomeEmpresa = usuario.displayName || email;
        let cnpj = "";

        if (empresaSnap.exists()) {
            const empresa = empresaSnap.data();

            nomeEmpresa = empresa.nomeEmpresa || nomeEmpresa;
            cnpj = empresa.cnpj || "";

            if (!usuario.displayName && empresa.nomeEmpresa) {
                await updateProfile(usuario, {
                    displayName: empresa.nomeEmpresa
                });
            }
        }

        localStorage.setItem(
            "currentUser",
            JSON.stringify({
                uid: usuario.uid,
                name: nomeEmpresa,
                cnpj: cnpj,
                email: usuario.email
            })
        );

        mostrarMensagem(
            mensagemLogin,
            "Login realizado com sucesso!",
            "sucesso"
        );

        setTimeout(() => {
            window.location.href = "../index.html";
        }, 800);

    } catch (error) {
        console.error(error);

        let mensagem = "E-mail ou senha incorretos.";

        if (error.code === "auth/user-not-found") {
            mensagem = "Nenhuma conta encontrada com este e-mail.";
        } else if (error.code === "auth/wrong-password") {
            mensagem = "Senha incorreta.";
        } else if (error.code === "auth/invalid-credential") {
            mensagem = "E-mail ou senha incorretos.";
        } else if (error.code === "auth/invalid-email") {
            mensagem = "Digite um e-mail válido.";
        }

        mostrarMensagem(
            mensagemLogin,
            mensagem,
            "erro"
        );
    }
});

onAuthStateChanged(auth, (usuario) => {
    if (usuario) {
        console.log("Usuário conectado:", usuario.email);
    } else {
        console.log("Nenhum usuário conectado.");
    }
});

window.logout = async function () {
    try {
        await signOut(auth);
        localStorage.removeItem("currentUser");
        window.location.href = "../index.html";
    } catch (error) {
        console.error(error);
    }
};