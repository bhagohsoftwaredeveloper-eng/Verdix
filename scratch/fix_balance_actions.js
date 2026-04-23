const fs = require('fs');
const path = "d:\\BHAGOH PROJECT\\Stock_Pilot\\app\\(app)\\suppliers\\balance\\page.tsx";
let content = fs.readFileSync(path, 'utf8');

const target = `                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <SupplierTransactionDialog 
                               supplierId={supplier.id} 
                               supplierName={supplier.name}
                               trigger={
                                 <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                   <Eye className="mr-2 h-4 w-4" />
                                   View Transactions
                                 </DropdownMenuItem>
                               }
                            />
                            <MakePaymentDialog 
                                supplier={supplier} 
                                onPaymentComplete={loadSuppliers}
                                trigger={
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Make Payment
                                  </DropdownMenuItem>
                                }
                              />`;

const replacement = `                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                                setSelectedSupplier(supplier);
                                setIsTransactionDialogOpen(true);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Transactions
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                                setSelectedSupplier(supplier);
                                setIsPaymentDialogOpen(true);
                            }}>
                              <CreditCard className="mr-2 h-4 w-4" />
                              Make Payment
                            </DropdownMenuItem>`;

// Try to normalize line endings and whitespace for the search
const normalize = (s) => s.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();

const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
    const newContent = normalizedContent.replace(normalizedTarget, replacement.replace(/\r\n/g, '\n'));
    fs.writeFileSync(path, newContent);
    console.log("Successfully replaced!");
} else {
    console.log("Target not found exactly. Trying regex...");
    // Try a more flexible regex
    const regexTarget = target
        .replace(/\r\n/g, '\\s+')
        .replace(/\n/g, '\\s+')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape regex chars
        .replace(/\\ /g, '\\s+');
    
    const re = new RegExp(regexTarget, 'g');
    if (re.test(normalizedContent)) {
        const newContent = normalizedContent.replace(re, replacement.replace(/\r\n/g, '\n'));
        fs.writeFileSync(path, newContent);
        console.log("Successfully replaced with regex!");
    } else {
        console.log("Still not found even with regex.");
    }
}
