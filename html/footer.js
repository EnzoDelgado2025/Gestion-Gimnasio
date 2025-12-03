// Inyectar Footer en todos los HTML
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si ya existe un footer
    if (document.querySelector('footer')) {
        return;
    }

    // Crear el footer
    const footer = document.createElement('footer');
    
    footer.innerHTML = `
        <div class="footer-content">
            <p><strong>GymMax - Sistema de Gestión de Gimnasio</strong></p>
            <div class="footer-links">
                <span>&copy; 2025 GymMax. Todos los derechos reservados.</span>
            </div>
            <p style="font-size: 0.85em; color: #bdc3c7;">Tu plataforma de fitness integral • Entrena, crece y triunfa</p>
        </div>
    `;

    // Agregar estilos del footer si no existen
    if (!document.querySelector('link[href*="footer.css"]')) {
        const linkFooter = document.createElement('link');
        linkFooter.rel = 'stylesheet';
        linkFooter.href = calcularRutaBase() + 'footer.css';
        document.head.appendChild(linkFooter);
    }

    // Insertar footer al final del body
    document.body.appendChild(footer);
});

// Función para obtener la ruta raíz
function obtenerRaizServidor() {
    const host = window.location.origin; // ej: http://localhost:3000
    return host + '/html/';
}

// Función para calcular la ruta base según la ubicación del archivo
function calcularRutaBase() {
    const currentUrl = window.location.href;
    
    // Si la URL contiene cualquiera de estas carpetas anidadas
    if (currentUrl.includes('/Personas/') || 
        currentUrl.includes('/Empleados/') || 
        currentUrl.includes('/M%C3%A1quinas/') || 
        currentUrl.includes('/Máquinas/') ||
        currentUrl.includes('/Membresías/') || 
        currentUrl.includes('/Membres%C3%ADas/') ||
        currentUrl.includes('/Facturación/') || 
        currentUrl.includes('/Facturaci%C3%B3n/')) {
        return '../../';
    }
    
    // Si está en html/ (root level)
    if (currentUrl.includes('/html/')) {
        return '../';
    }
    
    // Por defecto
    return '';
}

// Redirigir a Inicio
function irAInicio() {
    const currentUrl = window.location.href;
    
    // Si está en localhost/http
    if (currentUrl.includes('http://') || currentUrl.includes('https://')) {
        window.location.href = obtenerRaizServidor() + 'inicio.html';
    } else {
        // Si es archivo local
        const ruta = calcularRutaBase() + 'inicio.html';
        window.location.href = ruta;
    }
}

// Redirigir a Login
function irALogin() {
    const currentUrl = window.location.href;
    
    // Si está en localhost/http
    if (currentUrl.includes('http://') || currentUrl.includes('https://')) {
        window.location.href = obtenerRaizServidor() + 'login.html';
    } else {
        // Si es archivo local
        const ruta = calcularRutaBase() + 'login.html';
        window.location.href = ruta;
    }
}
