const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

// Normalize all newlines to LF
content = content.replace(/\r\n/g, '\n');

// Regex matches onAddTransaction up to the containing closed tags
const regex = /onAddTransaction\(\(newTx\) => \{[\s\S]*?\}\)\s*\}\)\s*\}\s*\n\s*\}\)\s*\}\s*\n\s*\}\)\s*\}\s*\n\s*\}\s*\}\s*\n\s*\}\s*\}\s*\n\s*\}\s*\}\s*\n\s*\}\s*\}\s*\n\s*\}\s*\}\s*\n\s*\}\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\ss*\}|onAddTransaction\(\(newTx\) => \{[\s\S]*?\}\s*\}\)\s*\}\s*\n\s*\}\s*\n\s*\/>\s*\n\s*\)\s*\}/; // simple pattern match

// Let's write a clean search: finding the specific pattern:
const index = content.indexOf("onAddTransaction={(newTx) => {");
if (index !== -1) {
  // We can find where the closing tags of this of activeModule 'ORDENES' ends by searching from this point to activeModule 'PROVEEDORES'
  const endMarker = "activeModule === 'PROVEEDORES'";
  const endIdx = content.indexOf(endMarker, index);
  if (endIdx !== -1) {
     const textToReplace = content.substring(index, endIdx);
     // Let's find the closing of the tag '/>' and standard closing of ORDENES
     const closeIdx = textToReplace.lastIndexOf('/>');
     if (closeIdx !== -1) {
        // Let's print out what is found
        console.log('FOUND STRETCH!');
        const searchBlock = textToReplace.substring(0, closeIdx + 2) + "\n         )}";
        
        const replacementBlock = `onAddTransaction={(newTx) => {
                      setTransactions(prev => [newTx, ...prev]);
                      syncToFirestore('transactions', newTx.id, newTx);
                      addAuditEntry('CREATE', 'TRANSACCION', newTx.id, newTx.description);
                    }}
                  />
               ) : (
                  <Suspense fallback={<div className="p-8 text-center text-slate-500 uppercase font-bold text-slate-400">Cargando Módulo Recepción Especial...</div>}>
                    <WorkOrderReception 
                      workOrders={workOrders}
                      currentUser={currentUser || 'SISTEMA'}
                      onUpdateOT={(ot) => {
                        setWorkOrders(prev => prev.map(o => o.id === ot.id ? ot : o));
                        addAuditEntry('UPDATE', 'ORDEN_TRABAJO', ot.id, \`Recepción OT \${ot.folio}\`);
                        syncToFirestore('work_orders', ot.id, ot);
                      }}
                      companyLogo={companyLogo}
                    />
                  </Suspense>
               )}
             </div>
           </div>
         )}`;

        // Verify if it is matching the last block of ORDENES
        // Let's replace the block in content
        const before = content.substring(0, index);
        const after = content.substring(index + searchBlock.length);
        
        // Let's check if the searchBlock looks correct or reconstruct it
        // To be absolutely precise, we find exactly from "onAddTransaction={(newTx) => {" to the preceding character before activeModule 'PROVEEDORES'
        const segmentStr = content.substring(index, endIdx);
        // Find the last index of `/>` and closing `)` and `}`
        const closeParenIdx = segmentStr.lastIndexOf(')}');
        if (closeParenIdx !== -1) {
           const finalSearchBlock = segmentStr.substring(0, closeParenIdx + 2);
           const finalContent = content.substring(0, index) + replacementBlock + content.substring(index + finalSearchBlock.length);
           fs.writeFileSync('App.tsx', finalContent, 'utf8');
           console.log('REPLACEMENT_SUCCESS_REGEXP_STRETCH');
           process.exit(0);
        }
     }
  }
}

console.log('COULD_NOT_RESOLVE_STRETCH');
