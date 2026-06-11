// Variable global para almacenar los datos del JSON
let dataPlaylist = null;

const selectFolder = document.getElementById('select-folder');
const playlistTree = document.getElementById('playlist-tree');
const audioPlayer = document.getElementById('audio-player');
const currentTrackTitle = document.getElementById('current-track-title');
const currentFolderHeader = document.getElementById('playlist-current-folder');

// 1. Cargar el archivo JSON desde la misma carpeta /src/ donde vive este script
async function cargarPlaylist() {
    try {
        const respuesta = await fetch('src/playlist.json');
        dataPlaylist = await respuesta.json();
        
        // Limpiar por completo el selector
        selectFolder.innerHTML = '<option value="" disabled selected>Selecciona una carpeta</option>';
        
        // Rellenar el select dinámicamente con las carpetas del JSON
        dataPlaylist.carpetas.forEach(carpeta => {
            const opcion = document.createElement('option');
            opcion.value = carpeta.id; 
            opcion.textContent = carpeta.nombre_elegante || carpeta.id; 
            selectFolder.appendChild(opcion);
        });

        // RESTAURAR ESTADO: Verificar si había una canción en memoria
        restaurarUltimoAudio();

    } catch (error) {
        console.error("Error al cargar el archivo playlist.json:", error);
        playlistTree.innerHTML = '<p class="empty-state" style="color: #ff4d4d;">Error al cargar la configuración de audio.</p>';
    }
}

// 2. Escuchar cuando el usuario seleccione una carpeta distinta
selectFolder.addEventListener('change', (e) => {
    const idCarpetaSeleccionada = e.target.value;
    const carpetaEncontrada = dataPlaylist.carpetas.find(c => c.id === idCarpetaSeleccionada);
    
    if (carpetaEncontrada) {
        renderizarLista(carpetaEncontrada);
    }
});

// Helper para formatear segundos en formato MM:SS
function formatearTiempo(segundos) {
    if (isNaN(segundos)) return "--:--";
    const min = Math.floor(segundos / 60);
    const seg = Math.floor(segundos % 60);
    return `${min}:${seg < 10 ? '0' : ''}${seg}`;
}

// Función en segundo plano para obtener la duración de un audio sin reproducirlo
function obtenerDuracionAudio(ruta) {
    return new Promise((resolve) => {
        const audioTemporal = new Audio();
        audioTemporal.src = encodeURI(ruta);
        audioTemporal.addEventListener('loadedmetadata', () => {
            resolve(formatearTiempo(audioTemporal.duration));
        });
        audioTemporal.addEventListener('error', () => {
            resolve("--:--");
        });
    });
}

// 3. Dibujar la lista de canciones en pantalla
async function renderizarLista(carpeta) {
    playlistTree.innerHTML = ''; 
    currentFolderHeader.textContent = `Contenido: ${carpeta.nombre_elegante}`;

    const folderTitle = document.createElement('div');
    folderTitle.className = 'folder-title';
    folderTitle.textContent = carpeta.nombre_elegante;
    
    const tracksList = document.createElement('ul');
    tracksList.className = 'tracks-list';

    // Obtener la canción guardada para marcarla visualmente si coincide
    const lastTrackSaved = localStorage.getItem('last_track_file');

    playlistTree.appendChild(folderTitle);
    playlistTree.appendChild(tracksList);

    // Iterar por cada audio configurado
    carpeta.audios.forEach(async (audio) => {
        const li = document.createElement('li');
        li.className = 'track-item';
        li.setAttribute('data-archivo', audio.archivo);

        let tituloVisual = audio.titulo_elegante;
        if (!tituloVisual) {
            const nombreBase = audio.archivo.split('/').pop();
            tituloVisual = nombreBase.replace(/\.[^/.]+$/, "");
        }

        // Crear contenedor para el texto del título
        const textSpan = document.createElement('span');
        textSpan.className = 'track-name';
        textSpan.textContent = tituloVisual;

        // Crear contenedor para la duración (se inicia cargando)
        const timeSpan = document.createElement('span');
        timeSpan.className = 'track-duration';
        timeSpan.textContent = "...";

        li.appendChild(textSpan);
        li.appendChild(timeSpan);

        if (lastTrackSaved === audio.archivo) {
            li.classList.add('active');
        }

        // Evento para reproducir la pista al hacer clic
        li.addEventListener('click', () => {
            reproducirAudio(audio.archivo, tituloVisual, li);
        });

        tracksList.appendChild(li);

        // Obtener la duración de forma asíncrona en segundo plano y pintarla
        const duracionString = await obtenerDuracionAudio(audio.archivo);
        timeSpan.textContent = duracionString;
    });
}

// 4. Función para reproducir el audio y guardar el estado actual
function reproducirAudio(rutaArchivo, titulo, elementoLi = null) {
    document.querySelectorAll('.track-item').forEach(el => el.classList.remove('active'));
    
    if (elementoLi) {
        elementoLi.classList.add('active');
    } else {
        const liEquivalente = document.querySelector(`.track-item[data-archivo="${rutaArchivo}"]`);
        if (liEquivalente) liEquivalente.classList.add('active');
    }

    // Guardar en localStorage la pista actual
    localStorage.setItem('last_track_file', rutaArchivo);
    localStorage.setItem('last_track_title', titulo);

    audioPlayer.src = encodeURI(rutaArchivo);
    currentTrackTitle.textContent = titulo;

    // Si tiene un tiempo guardado previo para este archivo exacto, restaurarlo
    const tiempoGuardado = localStorage.getItem(`time_${rutaArchivo}`);
    if (tiempoGuardado) {
        audioPlayer.currentTime = parseFloat(tiempoGuardado);
    }

    audioPlayer.play();
}

// 5. Monitorear el progreso para guardar los segundos actuales
audioPlayer.addEventListener('timeupdate', () => {
    const rutaActual = localStorage.getItem('last_track_file');
    if (rutaActual && audioPlayer.currentTime > 0) {
        localStorage.setItem(`time_${rutaActual}`, audioPlayer.currentTime);
    }
});

// 6. Intentar restaurar el reproductor al segundo donde se quedó
function restaurarUltimoAudio() {
    const lastTrackSaved = localStorage.getItem('last_track_file');
    const lastTitleSaved = localStorage.getItem('last_track_title');

    if (lastTrackSaved && lastTitleSaved) {
        audioPlayer.src = encodeURI(lastTrackSaved);
        currentTrackTitle.textContent = lastTitleSaved;

        const tiempoGuardado = localStorage.getItem(`time_${lastTrackSaved}`);
        if (tiempoGuardado) {
            audioPlayer.currentTime = parseFloat(tiempoGuardado);
        }
    }
}

// Iniciar la carga automática al abrir la web
cargarPlaylist();