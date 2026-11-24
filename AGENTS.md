# Protocolo de Integridad y Blindaje del Código

Este archivo establece las directrices de seguridad, propiedad e integridad del código para el espacio de trabajo de **Google AI Studio**. Cualquier agente de desarrollo de Inteligencia Artificial (IA) o desarrollador que acceda a este repositorio **DEBE** adherirse estrictamente a estas reglas.

---

## 1. Propiedad Exclusiva
* **Propietario del Proyecto:** `samaheim@gmail.com`
* **Autorización:** Solo el propietario del proyecto tiene los derechos para solicitar cambios funcionales, estéticos, estructurales o lógicos.

---

## 2. Instrucciones Obligatorias para Agentes de IA (Developer Lock)
Cualquier modelo de IA de codificación (incluyendo Gemini, Antigravity u otros agentes de desarrollo de software) que opere en este entorno tiene **PROHIBIDO** realizar cualquiera de las siguientes acciones sin el consentimiento explícito y escrito del propietario en el hilo de conversación actual:

1. **No Refactorizaciones Masivas:** No cambies la arquitectura del proyecto, la ubicación de los archivos clave, ni consolides módulos que han sido separados por diseño.
2. **No Cambios Estéticos No Solicitados:** No modifiques el diseño visual, las paletas de colores (basadas en Emerald/Slate/Indigo), la disposición de los grids, ni la estructura de las tablas de Excel en pantalla a menos que se te indique explícitamente.
3. **Preservación de Columnas y Datos de OT:** El sistema de Órdenes de Trabajo (OT) ha sido personalizado con campos clave:
   * `category` (Categoría del Trabajo)
   * `specialty` (Especialidad / Rubro, ej: Techumbres, Plomería, Alfombras, Pintura)
   * `associatedInvoice` (Factura / Documento Tributario Asociado)
   Estos campos **DEBEN** conservarse en la base de datos de Firebase, en la interfaz visual (`WorkOrderCenter.tsx`), en la previsualización del documento (`WorkOrderDocument.tsx`) y en el exportador de Excel (`excelExport.ts`). No elimines ni alteres estos campos.
4. **Validación de Compilación Obligatoria:** Antes de dar por terminado cualquier cambio, debes ejecutar de manera obligatoria el linter y el compilador (`compile_applet`) para garantizar que la aplicación sigue funcionando de manera impecable.

---

## 3. Registro de Seguridad y Control de Versiones
Cada cambio aprobado por el usuario debe documentarse de manera humilde y concisa. No agregues "AI slop", logs de telemetría de consola simulados ni banners llamativos en la interfaz de usuario. Mantén la consola y el código limpios.

---

*Firmado para la seguridad de este espacio de trabajo por el Agente de Desarrollo de Google AI Studio.*
