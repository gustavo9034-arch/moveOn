import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    serverTimestamp,
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


const firebaseConfig = {
    apiKey: "AIzaSyBCBw-CBGmOKOrbE4wz8VEx5hovj02B4Hg",
    authDomain: "bancoarmazem-7a554.firebaseapp.com",
    projectId: "bancoarmazem-7a554",
    storageBucket: "bancoarmazem-7a554.firebasestorage.app",
    messagingSenderId: "784965152715",
    appId: "1:784965152715:web:cbf43e40ab228d8022504e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


let mapa = null;
let marcadores = [];
let locais = [];

let empresaAtual = "Empresa não identificada";
let usuarioAtual = null;

let dadosEmpresaAtual = {
    nome: "",
    email: "",
    cnpj: "",
    fotoPerfil: ""
};

let mostrarSomenteMinhasOfertas = false;

const coordenadasCidades = {
    "sao paulo": [-23.5505, -46.6333],
    "campinas": [-22.9099, -47.0626],
    "guarulhos": [-23.4543, -46.5333],
    "rio de janeiro": [-22.9068, -43.1729],
    "belo horizonte": [-19.9167, -43.9345],
    "curitiba": [-25.4284, -49.2733],
    "brasilia": [-15.7939, -47.8828],
    "porto alegre": [-30.0346, -51.2177],
    "salvador": [-12.9777, -38.5016],
    "recife": [-8.0476, -34.8770],
    "fortaleza": [-3.7319, -38.5267],
    "manaus": [-3.1190, -60.0217],
    "belem": [-1.4558, -48.4902],
    "goiania": [-16.6869, -49.2648],
    "santos": [-23.9608, -46.3336]
};


function normalizarCidade(texto) {
    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}


function obterCoordenadas(cidade) {
    const cidadeNormalizada = normalizarCidade(cidade);

    if (coordenadasCidades[cidadeNormalizada]) {
        return coordenadasCidades[cidadeNormalizada];
    }

    return null;
}


/* =========================
   LOGIN / CONTA DO CLIENTE
========================= */

onAuthStateChanged(auth, async (user) => {
    usuarioAtual = user;

    const botaoCliente = document.querySelector(".cliente-btn");

    if (!user) {
        empresaAtual = "Empresa não identificada";

        dadosEmpresaAtual = {
            nome: "",
            email: "",
            cnpj: "",
            fotoPerfil: ""
        };

        atualizarBotaoCliente();

        return;
    }

    empresaAtual = user.displayName || user.email || "Empresa cadastrada";

    dadosEmpresaAtual = {
        nome: empresaAtual,
        email: user.email || "",
        cnpj: "",
        fotoPerfil: ""
    };

    atualizarBotaoCliente()

    try {
        const empresaRef = doc(db, "empresas", user.uid);
        const empresaSnap = await getDoc(empresaRef);

        if (empresaSnap.exists()) {
    const dados = empresaSnap.data();

    dadosEmpresaAtual = {
        nome: dados.nomeEmpresa || empresaAtual,
        email: dados.email || user.email || "",
        cnpj: dados.cnpj || "",
        fotoPerfil: dados.fotoPerfil || ""
    };

    empresaAtual = dadosEmpresaAtual.nome;

    atualizarBotaoCliente();
}
    } catch (erro) {
        console.error("Erro ao carregar dados da empresa:", erro);
    }
});


function mostrarMenuCliente() {
    const menuExistente = document.getElementById("menuCliente");

    if (menuExistente) {
        menuExistente.remove();
        return;
    }

    const nome = dadosEmpresaAtual.nome || empresaAtual;
    const email = dadosEmpresaAtual.email || "E-mail não informado";
    const cnpj = dadosEmpresaAtual.cnpj || "CNPJ não informado";

    const ofertasDaEmpresa = usuarioAtual
        ? locais.filter(local => local.uid === usuarioAtual.uid)
        : [];

    const foto = dadosEmpresaAtual.fotoPerfil;

    let avatarHTML;

    if (foto) {
        avatarHTML = `
            <img src="${foto}" alt="Logo da empresa">
        `;
    } else {
        const inicial = nome.charAt(0).toUpperCase();

        avatarHTML = `
            <span>${inicial}</span>
        `;
    }

    const menu = document.createElement("div");

    menu.id = "menuCliente";

    menu.innerHTML = `
        <div class="cliente-menu-conteudo">

            <div class="cliente-perfil">

                <div class="cliente-avatar">
                    ${avatarHTML}
                </div>

                <div class="cliente-info-principal">
                    <strong>${nome}</strong>
                    <span>Conta conectada</span>
                </div>

            </div>

            <button class="cliente-alterar-foto" id="btnAlterarFoto">
                Alterar foto
            </button>

            <input
                type="file"
                id="inputFotoEmpresa"
                accept="image/png,image/jpeg,image/webp"
                style="display:none;"
            >

            <div class="cliente-dados">

                <div>
                    <small>E-mail</small>
                    <p>${email}</p>
                </div>

                <div>
                    <small>CNPJ</small>
                    <p>${cnpj}</p>
                </div>

                <div class="cliente-ofertas">
                    <small>Minhas ofertas</small>
                    <strong>${ofertasDaEmpresa.length} ofertas cadastradas</strong>
                </div>

            </div>

            <button class="cliente-ver-ofertas" id="btnMinhasOfertas">
                Ver minhas ofertas
            </button>

            <button class="cliente-sair" id="btnSairConta">
                Sair da conta
            </button>

        </div>
    `;

    document.body.appendChild(menu);

    document.getElementById("btnAlterarFoto").addEventListener("click", () => {
        document.getElementById("inputFotoEmpresa").click();
    });

    document.getElementById("inputFotoEmpresa").addEventListener("change", async (event) => {
        const arquivo = event.target.files[0];

        if (!arquivo) {
            return;
        }

        await salvarFotoEmpresa(arquivo);
    });

    document.getElementById("btnMinhasOfertas").addEventListener("click", () => {
        mostrarSomenteMinhasOfertas = true;

        menu.remove();

        abrirAba("mapa");

        setTimeout(() => {
            aplicarFiltrosDoMapa();
        }, 100);
    });

    document.getElementById("btnSairConta").addEventListener("click", async () => {
        await signOut(auth);

        localStorage.removeItem("currentUser");

        window.location.href = "index.html";
    });
}

async function salvarFotoEmpresa(arquivo) {
    if (!usuarioAtual) {
        alert("Você precisa estar conectado para alterar a foto.");
        return;
    }

    if (!arquivo.type.startsWith("image/")) {
        alert("Selecione uma imagem válida.");
        return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 5 MB.");
        return;
    }

    try {
        const fotoComprimida = await processarImagem(arquivo);

        const empresaRef = doc(db, "empresas", usuarioAtual.uid);

        await updateDoc(empresaRef, {
            fotoPerfil: fotoComprimida
        });

        dadosEmpresaAtual.fotoPerfil = fotoComprimida;

        atualizarBotaoCliente();

        const menu = document.getElementById("menuCliente");

        if (menu) {
            menu.remove();
        }

        mostrarMenuCliente();

        alert("Foto da empresa atualizada.");

    } catch (erro) {
        console.error("Erro ao salvar foto:", erro);
        alert("Não foi possível salvar a foto.");
    }
}

function processarImagem(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();

        leitor.onload = (evento) => {
            const imagem = new Image();

            imagem.onload = () => {
                const tamanhoMaximo = 300;

                let largura = imagem.width;
                let altura = imagem.height;

                if (largura > altura) {
                    if (largura > tamanhoMaximo) {
                        altura = altura * (tamanhoMaximo / largura);
                        largura = tamanhoMaximo;
                    }
                } else {
                    if (altura > tamanhoMaximo) {
                        largura = largura * (tamanhoMaximo / altura);
                        altura = tamanhoMaximo;
                    }
                }

                const canvas = document.createElement("canvas");

                canvas.width = Math.round(largura);
                canvas.height = Math.round(altura);

                const contexto = canvas.getContext("2d");

                contexto.drawImage(
                    imagem,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                let qualidade = 0.8;

                let resultado = canvas.toDataURL(
                    "image/webp",
                    qualidade
                );

                while (resultado.length > 220000 && qualidade > 0.4) {
                    qualidade -= 0.1;

                    resultado = canvas.toDataURL(
                        "image/webp",
                        qualidade
                    );
                }

                if (resultado.length > 300000) {
                    reject(new Error("Imagem muito grande."));
                    return;
                }

                resolve(resultado);
            };

            imagem.onerror = () => {
                reject(new Error("Não foi possível carregar a imagem."));
            };

            imagem.src = evento.target.result;
        };

        leitor.onerror = () => {
            reject(new Error("Não foi possível ler a imagem."));
        };

        leitor.readAsDataURL(arquivo);
    });
}

function atualizarBotaoCliente() {
    const botaoCliente = document.querySelector(".cliente-btn");

    if (!botaoCliente) {
        return;
    }

    if (!usuarioAtual) {
        botaoCliente.textContent = "Área do cliente";

        botaoCliente.onclick = () => {
            window.location.href = "login/index.html";
        };

        return;
    }

    const nome = dadosEmpresaAtual.nome || empresaAtual;
    const foto = dadosEmpresaAtual.fotoPerfil;

    let fotoHTML;

    if (foto) {
        fotoHTML = `
            <span class="cliente-foto-header">
                <img src="${foto}" alt="Logo da empresa">
            </span>
        `;
    } else {
        const inicial = nome.charAt(0).toUpperCase();

        fotoHTML = `
            <span class="cliente-foto-header cliente-foto-inicial">
                ${inicial}
            </span>
        `;
    }

    botaoCliente.innerHTML = `
        ${fotoHTML}
        <span class="cliente-nome-header">${nome}</span>
    `;

    botaoCliente.onclick = () => {
        mostrarMenuCliente();
    };
}

/* =========================
   MAPA
========================= */

function iniciarMapa() {

    if (mapa) {
        setTimeout(() => {
            mapa.invalidateSize();
            aplicarFiltrosDoMapa();
        }, 100);

        return;
    }

    mapa = L.map("map", {
        zoomControl: false,
        attributionControl: true
    }).setView([-14.2350, -51.9253], 4);

    L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        {
            attribution: "Tiles &copy; Esri | OpenStreetMap contributors",
            maxZoom: 19
        }
    ).addTo(mapa);

    L.control.zoom({
        position: "bottomright"
    }).addTo(mapa);

    setTimeout(() => {
        mapa.invalidateSize();
        aplicarFiltrosDoMapa();
    }, 200);
}


function abrirAba(id) {

    document.querySelectorAll(".pagina").forEach((pagina) => {
        pagina.classList.remove("ativa");
    });

    const pagina = document.getElementById(id);

    if (pagina) {
        pagina.classList.add("ativa");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    if (id === "mapa") {

        setTimeout(() => {
            iniciarMapa();
        }, 100);

    }
}


function limparMarcadores() {

    marcadores.forEach((marcador) => {
        mapa.removeLayer(marcador);
    });

    marcadores = [];
}


function criarIconeVermelho() {

    return L.divIcon({
        className: "",
        html: `
            <div class="moveon-pin">
                <div class="moveon-pin-centro"></div>
            </div>
        `,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -42]
    });
}


function mostrarMarcadores(lista) {

    if (!mapa) {
        return;
    }

    limparMarcadores();

    const locaisPorCoordenada = {};

    lista.forEach((local) => {

        const lat = Number(local.lat);
        const lng = Number(local.lng);

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
        ) {
            console.warn("Oferta sem coordenadas válidas:", local);
            return;
        }

        const chave = `${lat},${lng}`;

        if (!locaisPorCoordenada[chave]) {
            locaisPorCoordenada[chave] = [];
        }

        locaisPorCoordenada[chave].push(local);
    });

    Object.values(locaisPorCoordenada).forEach((grupo) => {

        grupo.forEach((local, indice) => {

            let lat = Number(local.lat);
            let lng = Number(local.lng);

            if (grupo.length > 1) {

                const angulo =
                    (2 * Math.PI * indice) / grupo.length;

                const distancia = 0.004;

                lat += Math.cos(angulo) * distancia;
                lng += Math.sin(angulo) * distancia;
            }

            const marcador = L.marker(
                [lat, lng],
                {
                    icon: criarIconeVermelho()
                }
            ).addTo(mapa);

            const contatoTelefone = local.telefone
                ? `<div><strong>Telefone:</strong> ${local.telefone}</div>`
                : "";

            const contatoEmail = local.email
                ? `<div><strong>E-mail:</strong> ${local.email}</div>`
                : "";

            const empresa = local.empresa
                ? `<div><strong>Oferecida por:</strong> ${local.empresa}</div>`
                : "";

            const popup = `
                <div class="popup-moveon">

                    <h3>${local.titulo || "Espaço disponível"}</h3>

                    <p>${local.descricao || ""}</p>

                    <p>
                        <strong>Capacidade:</strong>
                        ${local.capacidade || "Não informado"}
                    </p>

                    <p>
                        <strong>Disponibilidade:</strong>
                        ${local.data || "Não informado"}
                    </p>

                    ${empresa}

                    <hr>

                    ${contatoTelefone}
                    ${contatoEmail}

                </div>
            `;

            marcador.bindPopup(popup);

            marcadores.push(marcador);
        });
    });

    const contador = document.getElementById("contadorEspacos");

    if (contador) {
        contador.textContent =
            `${marcadores.length} espaços encontrados`;
    }

    console.log(
        `Marcadores exibidos no mapa: ${marcadores.length}`
    );
}


function aplicarFiltrosDoMapa() {

    if (!mapa) {
        return;
    }

    const campoBusca = document.getElementById("buscaMapa");
    const filtroEspaco = document.getElementById("filtroTipoEspaco");
    const filtroCarga = document.getElementById("filtroTipoCarga");

    const busca = normalizarCidade(
        campoBusca ? campoBusca.value : ""
    );

    const tipoEspaco =
        filtroEspaco && filtroEspaco.value
            ? filtroEspaco.value
            : "todos";

    const tipoCarga =
        filtroCarga && filtroCarga.value
            ? filtroCarga.value
            : "todos";

    console.log("Filtros do mapa:", {
        busca,
        tipoEspaco,
        tipoCarga,
        totalLocais: locais.length
    });

    const resultados = locais.filter((local) => {

        const correspondeEspaco =
            tipoEspaco === "todos" ||
            tipoEspaco === "" ||
            local.tipo === tipoEspaco;

        const correspondeCarga =
            tipoCarga === "todos" ||
            tipoCarga === "" ||
            local.tipoCarga === tipoCarga;

        const textoPesquisa = normalizarCidade(
            `${local.cidade || ""} ${local.destino || ""} ${local.titulo || ""} ${local.origem || ""}`
        );

        const correspondeBusca =
            !busca ||
            textoPesquisa.includes(busca);

        const correspondeUsuario =
    !mostrarSomenteMinhasOfertas ||
    (usuarioAtual && local.uid === usuarioAtual.uid);

return (
    correspondeEspaco &&
    correspondeCarga &&
    correspondeBusca &&
    correspondeUsuario
);
    });

    console.log("Resultados para o mapa:", resultados);

    mostrarMarcadores(resultados);
}


function buscarMapa() {
    aplicarFiltrosDoMapa();
}


function limparFiltrosMapa() {

    mostrarSomenteMinhasOfertas = false;

    const busca = document.getElementById("buscaMapa");
    const tipoEspaco = document.getElementById("filtroTipoEspaco");
    const tipoCarga = document.getElementById("filtroTipoCarga");

    if (busca) {
        busca.value = "";
    }

    if (tipoEspaco) {
        tipoEspaco.value = "";
    }

    if (tipoCarga) {
        tipoCarga.value = "";
    }

    aplicarFiltrosDoMapa();
}


function filtrarEspecificacao(tipoCarga) {

    abrirAba("mapa");

    setTimeout(() => {

        const filtro = document.getElementById("filtroTipoCarga");

        if (filtro) {
            filtro.value = tipoCarga;
        }

        aplicarFiltrosDoMapa();

    }, 150);
}


function filtrarAluguel() {

    const origem = document.getElementById("alugarOrigem");
    const destino = document.getElementById("alugarDestino");
    const tipoEspaco = document.getElementById("alugarTipoEspaco");
    const tipoCarga = document.getElementById("alugarTipoCarga");

    abrirAba("mapa");

    setTimeout(() => {

        const buscaMapa = document.getElementById("buscaMapa");
        const filtroEspaco = document.getElementById("filtroTipoEspaco");
        const filtroCarga = document.getElementById("filtroTipoCarga");

        if (buscaMapa) {
            buscaMapa.value = origem ? origem.value : "";
        }

        if (filtroEspaco) {
    filtroEspaco.value = tipoEspaco ? tipoEspaco.value : "";
}

if (filtroCarga) {
    filtroCarga.value = tipoCarga ? tipoCarga.value : "";
}

        aplicarFiltrosDoMapa();

    }, 150);
}


function filtrarAluguelArmazem() {

    const local = document.getElementById("alugarArmazemLocal");

    abrirAba("mapa");

    setTimeout(() => {

        const buscaMapa = document.getElementById("buscaMapa");
        const filtroEspaco = document.getElementById("filtroTipoEspaco");

        if (buscaMapa) {
            buscaMapa.value = local ? local.value : "";
        }

        if (filtroEspaco) {
            filtroEspaco.value = "armazem";
        }

        aplicarFiltrosDoMapa();

    }, 150);
}


/* =========================
   OFERECER ESPAÇO
========================= */

function mostrarOferta(tipo) {

    const transporte = document.getElementById("ofertaTransporte");
    const armazem = document.getElementById("ofertaArmazem");

    if (transporte) {
        transporte.style.display =
            tipo === "transporte" ? "block" : "none";
    }

    if (armazem) {
        armazem.style.display =
            tipo === "armazem" ? "block" : "none";
    }

    if (tipo === "transporte") {
        setTimeout(() => {
            document.getElementById("ofertaTransporte")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }, 100);
    }

    if (tipo === "armazem") {
        setTimeout(() => {
            document.getElementById("ofertaArmazem")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }, 100);
    }
}

function mostrarConfirmacaoOferta(idResultado) {

    const resultado = document.getElementById(idResultado);

    if (!resultado) {
        return;
    }

    resultado.classList.add("ativo");

    resultado.innerHTML = `
        <h3>Oferta cadastrada com sucesso!</h3>

        <p>
            Sua oferta já está disponível no mapa para outras empresas.
        </p>

        <button onclick="abrirMapaAposCadastro()">
            Ver oferta no mapa
        </button>
    `;
}

function abrirMapaAposCadastro() {

    abrirAba("mapa");

    setTimeout(() => {
        if (mapa) {
            mapa.invalidateSize();
            aplicarFiltrosDoMapa();
        }
    }, 300);
}

async function cadastrarTransporte() {

    const origem = document.getElementById("ofertaOrigem").value.trim();
    const destino = document.getElementById("ofertaDestino").value.trim();
    const volume = document.getElementById("ofertaVolume").value.trim();
    const peso = document.getElementById("ofertaPeso").value.trim();
    const data = document.getElementById("ofertaData").value;
    const tipoCarga = document.getElementById("ofertaTipoCarga").value;
    const telefone = document.getElementById("ofertaTelefone").value.trim();
    const email = document.getElementById("ofertaEmail").value.trim();

    const resultado = document.getElementById(
        "resultadoOfertaTransporte"
    );

    if (
        !origem ||
        !destino ||
        !volume ||
        !peso ||
        !data ||
        !tipoCarga ||
        !telefone ||
        !email
    ) {

        resultado.textContent =
            "Preencha todos os campos antes de cadastrar.";

        resultado.style.color = "#e50914";

        return;
    }

    const coordenadas = obterCoordenadas(origem);

    if (!coordenadas) {

        resultado.textContent =
            "Cidade de origem não encontrada no sistema. Use uma cidade cadastrada para aparecer no mapa.";

        resultado.style.color = "#e50914";

        return;
    }

    if (!usuarioAtual) {

        resultado.textContent =
            "Você precisa estar conectado para oferecer um espaço.";

        resultado.style.color = "#e50914";

        return;
    }

    try {

        resultado.textContent = "Salvando oferta...";
        resultado.style.color = "#333";

        await addDoc(collection(db, "ofertas"), {

            tipo: "transporte",

            tipoCarga: tipoCarga,

            cidade: origem,

            origem: origem,

            destino: destino,

            volume: Number(volume),

            peso: Number(peso),

            data: data,

            titulo: `${origem} → ${destino}`,

            descricao: "Veículo com espaço disponível.",

            capacidade: `${volume} m³ · até ${peso} kg`,

            telefone: telefone,

            email: email,

            empresa: empresaAtual,

            uid: usuarioAtual.uid,

            lat: coordenadas[0],

            lng: coordenadas[1],

            criadoEm: serverTimestamp()

        });

        mostrarConfirmacaoOferta("resultadoOfertaTransporte");

        document.getElementById("ofertaOrigem").value = "";
        document.getElementById("ofertaDestino").value = "";
        document.getElementById("ofertaVolume").value = "";
        document.getElementById("ofertaPeso").value = "";
        document.getElementById("ofertaData").value = "";
        document.getElementById("ofertaTipoCarga").value = "";
        document.getElementById("ofertaTelefone").value = "";
        document.getElementById("ofertaEmail").value = "";

    } catch (erro) {

        console.error(
            "Erro ao cadastrar transporte:",
            erro
        );

        resultado.textContent =
            "Não foi possível cadastrar a oferta. Verifique as regras do Firestore.";

        resultado.style.color = "#e50914";
    }
}


async function cadastrarArmazem() {

    const local = document.getElementById("ofertaArmLocal").value.trim();

    const capacidade = document
        .getElementById("ofertaArmCapacidade")
        .value
        .trim();

    const tempo = document
        .getElementById("ofertaArmTempo")
        .value
        .trim();

    const tipo = document
        .getElementById("ofertaArmTipo")
        .value;

    const telefone = document
        .getElementById("ofertaArmTelefone")
        .value
        .trim();

    const email = document
        .getElementById("ofertaArmEmail")
        .value
        .trim();

    const resultado = document.getElementById(
        "resultadoOfertaArmazem"
    );

    if (
        !local ||
        !capacidade ||
        !tempo ||
        !tipo ||
        !telefone ||
        !email
    ) {

        resultado.textContent =
            "Preencha todos os campos antes de cadastrar.";

        resultado.style.color = "#e50914";

        return;
    }

    const coordenadas = obterCoordenadas(local);

    if (!coordenadas) {

        resultado.textContent =
            "Cidade não encontrada no sistema. Use uma cidade cadastrada para aparecer no mapa.";

        resultado.style.color = "#e50914";

        return;
    }

    if (!usuarioAtual) {

        resultado.textContent =
            "Você precisa estar conectado para oferecer um espaço.";

        resultado.style.color = "#e50914";

        return;
    }

    try {

        resultado.textContent = "Salvando oferta...";
        resultado.style.color = "#333";

        await addDoc(collection(db, "ofertas"), {

            tipo: "armazem",

            tipoCarga: tipo,

            cidade: local,

            origem: "",

            destino: "",

            capacidadeM3: Number(capacidade),

            titulo: `Armazém em ${local}`,

            descricao: "Espaço disponível para armazenamento.",

            capacidade: `${capacidade} m³ disponíveis`,

            data: tempo,

            telefone: telefone,

            email: email,

            empresa: empresaAtual,

            uid: usuarioAtual.uid,

            lat: coordenadas[0],

            lng: coordenadas[1],

            criadoEm: serverTimestamp()

        });

        mostrarConfirmacaoOferta("resultadoOfertaArmazem");

        document.getElementById("ofertaArmLocal").value = "";
        document.getElementById("ofertaArmCapacidade").value = "";
        document.getElementById("ofertaArmTempo").value = "";
        document.getElementById("ofertaArmTipo").value = "";
        document.getElementById("ofertaArmTelefone").value = "";
        document.getElementById("ofertaArmEmail").value = "";

    } catch (erro) {

        console.error(
            "Erro ao cadastrar armazém:",
            erro
        );

        resultado.textContent =
            "Não foi possível cadastrar a oferta. Verifique as regras do Firestore.";

        resultado.style.color = "#e50914";
    }
}


/* =========================
   CARREGAR OFERTAS FIREBASE
========================= */

function carregarOfertasFirebase() {

    const ofertasRef = collection(db, "ofertas");

    onSnapshot(
        ofertasRef,

        (snapshot) => {

            const ofertasOnline = snapshot.docs.map((documento) => ({

                id: documento.id,

                ...documento.data(),

                fonte: "firebase"

            }));

          locais = ofertasOnline;

            console.log(
                `Ofertas carregadas do Firebase: ${ofertasOnline.length}`
            );

            if (mapa) {
                aplicarFiltrosDoMapa();
            }

        },

        (erro) => {

            console.error(
                "Erro ao carregar ofertas do Firebase:",
                erro
            );

            locais = [];

            if (mapa) {
                aplicarFiltrosDoMapa();
            }

        }
    );
}


/* =========================
   INICIALIZAÇÃO
========================= */

document.addEventListener("DOMContentLoaded", () => {

    abrirAba("inicio");

    carregarOfertasFirebase();

});


/* =========================
   FUNÇÕES DISPONÍVEIS NO HTML
========================= */

window.abrirAba = abrirAba;
window.mostrarOferta = mostrarOferta;
window.buscarMapa = buscarMapa;
window.aplicarFiltrosDoMapa = aplicarFiltrosDoMapa;
window.limparFiltrosMapa = limparFiltrosMapa;
window.filtrarEspecificacao = filtrarEspecificacao;
window.filtrarAluguel = filtrarAluguel;
window.filtrarAluguelArmazem = filtrarAluguelArmazem;
window.cadastrarTransporte = cadastrarTransporte;
window.cadastrarArmazem = cadastrarArmazem;
window.abrirMapaAposCadastro = abrirMapaAposCadastro;