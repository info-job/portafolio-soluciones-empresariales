export const DEFAULT_ASSETFLOW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 110" width="360" height="110">
  <!-- Top green Accent line -->
  <rect x="0" y="0" width="360" height="5" fill="#006233" rx="1.5" />
  
  <g transform="translate(10, 10)">
    <!-- Silhouette 1: Green Father -->
    <g>
      <circle cx="24" cy="34" r="10" fill="#006233" />
      <path d="M10 48 C10 43 14 43 18 43 L30 43 C34 43 38 43 38 48 L38 88 C38 90 36 90 34 90 L14 90 C12 90 10 90 10 88 Z" fill="#006233" />
    </g>
    
    <!-- Silhouette 2: Blue Mother with overlapping mask border -->
    <g>
      <circle cx="48" cy="37" r="10" fill="#002D62" stroke="#FFFFFF" stroke-width="3" />
      <path d="M34 51 C34 46 38 46 42 46 L54 46 C58 46 62 46 62 51 L62 88 C62 90 60 90 58 90 L38 90 C36 90 34 90 34 88 Z" fill="#002D62" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round" />
      <!-- Re-fill to clear internal stroke lines -->
      <circle cx="48" cy="37" r="10" fill="#002D62" />
      <path d="M34 51 C34 46 38 46 42 46 L54 46 C58 46 62 46 62 51 L62 88 C62 90 60 90 58 90 L38 90 C36 90 34 90 34 88 Z" fill="#002D62" />
    </g>
    
    <!-- Silhouette 3: Green Child with overlapping mask border -->
    <g>
      <circle cx="71" cy="53" r="7" fill="#006233" stroke="#FFFFFF" stroke-width="2.5" />
      <path d="M62 63 C62 59 64 59 66 59 L76 59 C78 59 80 59 80 63 L80 88 C80 90 79 90 77 90 L65 90 C63 90 62 90 62 88 Z" fill="#006233" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round" />
      <!-- Re-fill -->
      <circle cx="71" cy="53" r="7" fill="#006233" />
      <path d="M62 63 C62 59 64 59 66 59 L76 59 C78 59 80 59 80 63 L80 88 C80 90 79 90 77 90 L65 90 C63 90 62 90 62 88 Z" fill="#006233" />
    </g>

    <!-- Text "AssetFlow" -->
    <text x="96" y="62" font-family="'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif" font-weight="800" font-size="44" fill="#006233" letter-spacing="-1.5">AssetFlow</text>
    
    <!-- Text "Corporación de Seguros" -->
    <text x="98" y="82" font-family="'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif" font-weight="600" font-size="18.5" fill="#4B5563" letter-spacing="-0.5">Corporación de Seguros</text>
  </g>
</svg>`;

export function getSvgAsPngBase64(svgString: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
      const url = `data:image/svg+xml;base64,${svgBase64}`;
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 720;
          canvas.height = 220;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, 720, 220);
            ctx.drawImage(img, 0, 0, 720, 220);
            const pngUrl = canvas.toDataURL('image/png');
            resolve(pngUrl);
          } else {
            resolve(url);
          }
        } catch (innerError) {
          console.error("Error drawing default logo on canvas, falling back to SVG URI:", innerError);
          resolve(url);
        }
      };
      img.onerror = (e) => {
        console.error("Error loading SVG default logo image, falling back to original svg:", e);
        const plainUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
        resolve(plainUrl);
      };
      img.src = url;
    } catch (err) {
      console.error("Critical error converting default logo SVG to base64 PNG:", err);
      resolve(`data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`);
    }
  });
}

/**
 * Draws a highly polished, vector-based AssetFlow logo directly into a jsPDF instance.
 * This is 100% reliable, runs synchronously, bypasses browser sandbox iframe canvas/CSP blocks,
 * and renders with infinite vector resolution under any zoom/print settings.
 */
export function drawPdfAssetFlowLogo(doc: any, x: number, y: number, scale: number = 1) {
  try {
    // 1. Top Green Accent Line
    doc.setFillColor(0, 98, 51); // #006233
    doc.rect(x, y, 80 * scale, 1 * scale, 'F');

    // 2. Father figure
    doc.setFillColor(0, 98, 51); // #006233
    doc.circle(x + 10 * scale, y + 8 * scale, 2.5 * scale, 'F');
    doc.roundedRect(x + 6.5 * scale, y + 10.5 * scale, 7 * scale, 10 * scale, 1.5 * scale, 1.5 * scale, 'F');

    // 3. Mother figure (Navy Blue)
    // Draw white contour circle first to create overlapping effect
    doc.setFillColor(255, 255, 255);
    doc.circle(x + 16 * scale, y + 9 * scale, 3.2 * scale, 'F');
    doc.roundedRect(x + 12.0 * scale, y + 11.0 * scale, 8 * scale, 10 * scale, 1.5 * scale, 1.5 * scale, 'F');
    
    // Draw real mother
    doc.setFillColor(0, 45, 98); // #002D62
    doc.circle(x + 16 * scale, y + 9 * scale, 2.5 * scale, 'F');
    doc.roundedRect(x + 12.5 * scale, y + 11.5 * scale, 7 * scale, 9 * scale, 1.5 * scale, 1.5 * scale, 'F');

    // 4. Child figure (Green)
    // Draw white contour circle first
    doc.setFillColor(255, 255, 255);
    doc.circle(x + 22 * scale, y + 13 * scale, 2.3 * scale, 'F');
    doc.roundedRect(x + 19.0 * scale, y + 14.5 * scale, 6 * scale, 6.5 * scale, 1 * scale, 1 * scale, 'F');

    // Draw real child
    doc.setFillColor(0, 98, 51); // #006233
    doc.circle(x + 22 * scale, y + 13 * scale, 1.8 * scale, 'F');
    doc.roundedRect(x + 19.5 * scale, y + 15 * scale, 5 * scale, 5.5 * scale, 1 * scale, 1 * scale, 'F');

    // 5. Text "AssetFlow"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15 * scale);
    doc.setTextColor(0, 98, 51);
    doc.text('AssetFlow', x + 28 * scale, y + 13 * scale);

    // 6. Text "Corporación de Seguros"
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7 * scale);
    doc.setTextColor(75, 85, 99);
    doc.text('Corporación de Seguros', x + 28 * scale, y + 17.5 * scale);
  } catch (err) {
    console.error("Error drawing vector AssetFlow logo in PDF:", err);
  }
}

