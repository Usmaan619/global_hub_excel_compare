// "use client"

// import { useState, useCallback } from "react"
// import { FileSpreadsheet, CheckCircle, Download, Trash2, Eye } from "lucide-react"
// import * as XLSX from "xlsx"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Switch } from "@/components/ui/switch"
// import { useToast } from "@/components/ui/use-toast"

// type SheetRow = Array<string | number | boolean | null>
// type ComparisonCell = {
//   value1: unknown
//   value2: unknown
//   isDifferent: boolean
//   isEmpty: boolean
// }
// type ComparisonRow = ComparisonCell[]
// type Stats = {
//   differences: number
//   matches: number
//   totalCells: number
//   accuracy: string | number
// }

// const ExcelComparator = () => {
//   const [file1, setFile1] = useState<File | null>(null)
//   const [file2, setFile2] = useState<File | null>(null)
//   const [data1, setData1] = useState<SheetRow[] | null>(null)
//   const [data2, setData2] = useState<SheetRow[] | null>(null)
//   const [comparison, setComparison] = useState<ComparisonRow[] | null>(null)
//   const [selectedSheet1, setSelectedSheet1] = useState("")
//   const [selectedSheet2, setSelectedSheet2] = useState("")
//   const [sheets1, setSheets1] = useState<string[]>([])
//   const [sheets2, setSheets2] = useState<string[]>([])
//   const [loading, setLoading] = useState(false)
//   const [showDifferencesOnly, setShowDifferencesOnly] = useState(false)
//   const [comparisonStats, setComparisonStats] = useState<Stats | null>(null)
//   const [dense, setDense] = useState(false)
//   const { toast } = useToast()

//   const handleFileUpload = useCallback(
//     async (file: File | undefined, fileNumber: 1 | 2) => {
//       if (!file) return
//       setLoading(true)
//       try {
//         const arrayBuffer = await file.arrayBuffer()
//         const workbook = XLSX.read(arrayBuffer, { type: "array" })
//         const sheetNames = workbook.SheetNames

//         const firstSheet = sheetNames[0]
//         if (!firstSheet) {
//           toast({
//             title: "No sheets found",
//             description: "Please upload a valid spreadsheet.",
//             variant: "destructive",
//           })
//           return
//         }

//         const worksheet = workbook.Sheets[firstSheet]
//         const jsonData = XLSX.utils.sheet_to_json(worksheet, {
//           header: 1,
//           defval: "",
//         }) as SheetRow[]

//         if (fileNumber === 1) {
//           setFile1(file)
//           setSheets1(sheetNames)
//           setSelectedSheet1(firstSheet)
//           setData1(jsonData)
//         } else {
//           setFile2(file)
//           setSheets2(sheetNames)
//           setSelectedSheet2(firstSheet)
//           setData2(jsonData)
//         }
//       } catch (error) {
//         console.error(" Error reading file:", error)
//         toast({
//           title: "File error",
//           description: "Unable to read the Excel file.",
//           variant: "destructive",
//         })
//       } finally {
//         setLoading(false)
//       }
//     },
//     [toast],
//   )

//   const handleSheetChange = useCallback(
//     async (sheetName: string, fileNumber: 1 | 2) => {
//       if (!sheetName) return
//       setLoading(true)
//       try {
//         const file = fileNumber === 1 ? file1 : file2
//         if (!file) return
//         const arrayBuffer = await file.arrayBuffer()
//         const workbook = XLSX.read(arrayBuffer, { type: "array" })
//         const worksheet = workbook.Sheets[sheetName]
//         const jsonData = XLSX.utils.sheet_to_json(worksheet, {
//           header: 1,
//           defval: "",
//         }) as SheetRow[]

//         if (fileNumber === 1) {
//           setSelectedSheet1(sheetName)
//           setData1(jsonData)
//         } else {
//           setSelectedSheet2(sheetName)
//           setData2(jsonData)
//         }
//       } catch (error) {
//         console.error(" Error reading sheet:", error)
//         toast({
//           title: "Sheet error",
//           description: "Unable to read the selected sheet.",
//           variant: "destructive",
//         })
//       } finally {
//         setLoading(false)
//       }
//     },
//     [file1, file2, toast],
//   )

//   const compareData = useCallback(() => {
//     if (!data1 || !data2) return
//     setLoading(true)

//     const maxRows = Math.max(data1.length, data2.length)
//     const maxCols = Math.max(Math.max(...data1.map((row) => row.length)), Math.max(...data2.map((row) => row.length)))

//     const comparisonResult = []
//     let differences = 0
//     let matches = 0
//     let totalCells = 0

//     for (let i = 0; i < maxRows; i++) {
//       const row = []
//       const row1 = data1[i] || []
//       const row2 = data2[i] || []

//       for (let j = 0; j < maxCols; j++) {
//         const cell1 = row1[j] ?? ""
//         const cell2 = row2[j] ?? ""

//         const trimmed1 = String(cell1).trim()
//         const trimmed2 = String(cell2).trim()
//         const isDifferent = trimmed1 !== trimmed2

//         if (isDifferent) differences++
//         else matches++
//         totalCells++

//         row.push({
//           value1: cell1,
//           value2: cell2,
//           isDifferent,
//           isEmpty: trimmed1 === "" && trimmed2 === "",
//         })
//       }
//       comparisonResult.push(row)
//     }

//     setComparison(comparisonResult)
//     setComparisonStats({
//       differences,
//       matches,
//       totalCells,
//       accuracy: totalCells > 0 ? ((matches / totalCells) * 100).toFixed(2) : 0,
//     })
//     setLoading(false)
//   }, [data1, data2])

//   const exportComparison = () => {
//     if (!comparison || comparison.length === 0) return

//     const firstRow = comparison[0]
//     const hasHeaders = firstRow?.every((cell) => cell.value1 === cell.value2 && !cell.isDifferent)

//     const headers: string[] = []
//     if (hasHeaders && firstRow) {
//       firstRow.forEach((cell, colIndex) => {
//         const headerValue = String(cell.value1 ?? "").trim()
//         headers[colIndex] = headerValue || XLSX.utils.encode_col(colIndex)
//       })
//     }

//     const exportData: Array<{
//       "Record no.": string
//       Field: string
//       Given: string
//       Entered: string
//     }> = []

//     const startRow = hasHeaders ? 1 : 0

//     for (let rowIndex = startRow; rowIndex < comparison.length; rowIndex++) {
//       const row = comparison[rowIndex]
//       if (!row) continue

//       const hasDifferences = row.some((cell) => cell.isDifferent && !cell.isEmpty)

//       if (hasDifferences) {
//         const recordNo = String(comparison[rowIndex][0]?.value1 ?? "").trim() || ""

//         let recordNoAdded = false

//         row.forEach((cell, colIndex) => {
//           if (cell.isDifferent && !cell.isEmpty) {
//             let fieldName: string

//             if (hasHeaders && headers[colIndex]) {
//               fieldName = headers[colIndex]
//             } else {
//               const colLetter = XLSX.utils.encode_col(colIndex)
//               fieldName = `Column ${colLetter}`
//             }

//             exportData.push({
//               "Record no.": recordNoAdded ? "" : recordNo,
//               Field: fieldName,
//               Given: String(cell.value1 ?? "").trim(),
//               Entered: String(cell.value2 ?? "").trim(),
//             })

//             recordNoAdded = true
//           }
//         })

//         // Add a blank row after each record
//         exportData.push({
//           "Record no.": "",
//           Field: "",
//           Given: "",
//           Entered: "",
//         })
//       }
//     }

//     if (exportData.length === 0) {
//       exportData.push({
//         "Record no.": "",
//         Field: "No differences found",
//         Given: "",
//         Entered: "",
//       })
//     } else if (comparisonStats) {
//       exportData.push({ "Record no.": "", Field: "", Given: "", Entered: "" }) // spacing
//       exportData.push({
//         "Record no.": "",
//         Field: `You got ${comparisonStats.matches} out of ${comparisonStats.totalCells} correct.`,
//         Given: `Accuracy: ${comparisonStats.accuracy}%`,
//         Entered: "",
//       })
//     }

//     const ws = XLSX.utils.json_to_sheet(exportData)

//     const colWidths = [
//       { wch: Math.max(20, ...exportData.map((r) => r["Record no."].length)) }, // was 12
//       { wch: Math.max(30, ...exportData.map((r) => r.Field.length)) }, // was 20
//       { wch: Math.max(40, ...exportData.map((r) => r.Given.length)) }, // was 15
//       { wch: Math.max(40, ...exportData.map((r) => r.Entered.length)) }, // was 15
//     ]

//     ws["!cols"] = colWidths

//     const wb = XLSX.utils.book_new()
//     XLSX.utils.book_append_sheet(wb, ws, "Comparison")

//     try {
//       const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
//       const blob = new Blob([wbout], {
//         type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//       })
//       const url = URL.createObjectURL(blob)
//       const a = document.createElement("a")
//       a.href = url
//       a.download = "excel_comparison_result.xlsx"
//       document.body.appendChild(a)
//       a.click()
//       a.remove()
//       URL.revokeObjectURL(url)
//     } catch (err) {
//       console.error("Export error:", err)
//     }
//   }

//   const clearAll = () => {
//     setFile1(null)
//     setFile2(null)
//     setData1(null)
//     setData2(null)
//     setComparison(null)
//     setSelectedSheet1("")
//     setSelectedSheet2("")
//     setSheets1([])
//     setSheets2([])
//     setComparisonStats(null)
//     setShowDifferencesOnly(false)
//     setDense(false)
//   }

//   const getVisibleRows = () => {
//     if (!comparison) return []
//     if (!showDifferencesOnly) return comparison
//     return comparison.filter((row) => row.some((cell) => cell.isDifferent && !cell.isEmpty))
//   }

//   const FileUploadCard = ({
//     fileNumber,
//     file,
//     sheets,
//     selectedSheet,
//     onFileUpload,
//     onSheetChange,
//   }: {
//     fileNumber: 1 | 2
//     file: File | null
//     sheets: string[]
//     selectedSheet: string
//     onFileUpload: (file: File | undefined, fileNumber: 1 | 2) => void
//     onSheetChange: (sheet: string, fileNumber: 1 | 2) => void
//   }) => {
//     const [dragOver, setDragOver] = useState(false)
//     return (
//       <Card
//         className={["border border-border transition-colors", dragOver ? "ring-2 ring-primary" : ""].join(" ")}
//         onDragOver={(e) => {
//           e.preventDefault()
//           setDragOver(true)
//         }}
//         onDragLeave={() => setDragOver(false)}
//         onDrop={(e) => {
//           e.preventDefault()
//           setDragOver(false)
//           const dropped = e.dataTransfer?.files?.[0]
//           if (dropped) onFileUpload(dropped, fileNumber)
//         }}
//       >
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <FileSpreadsheet className="h-5 w-5 text-primary" />
//             {fileNumber == 1 ? "Correct" : "Incorrect"} File
//           </CardTitle>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           {!file ? (
//             <div className="flex flex-col items-start gap-2 w-full">
//               <Label htmlFor={`file-${fileNumber}`} className="sr-only">
//                 Upload file {fileNumber}
//               </Label>
//               <div
//                 className={[
//                   "w-full rounded-md border border-dashed border-input bg-background/60",
//                   "px-3 py-8 text-center text-sm text-muted-foreground",
//                 ].join(" ")}
//               >
//                 Drag & drop a file here or
//                 <span className="mx-1 font-medium text-foreground">browse</span>
//               </div>
//               <Input
//                 id={`file-${fileNumber}`}
//                 type="file"
//                 accept=".xlsx,.xls,.csv"
//                 onChange={(e) => onFileUpload(e.target.files?.[0], fileNumber)}
//               />
//               <p className="text-xs text-muted-foreground">Accepted: .xlsx, .xls, .csv</p>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               <div className="flex items-center text-foreground">
//                 <CheckCircle className="mr-2 h-5 w-5 text-primary" />
//                 <span className="font-medium">{file.name}</span>
//               </div>

//               {sheets.length > 1 && (
//                 <div className="grid gap-2">
//                   <Label htmlFor={`sheet-${fileNumber}`}>Select sheet</Label>
//                   <select
//                     id={`sheet-${fileNumber}`}
//                     value={selectedSheet}
//                     onChange={(e) => onSheetChange(e.target.value, fileNumber)}
//                     className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
//                   >
//                     {sheets.map((sheet) => (
//                       <option key={sheet} value={sheet}>
//                         {sheet}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               )}
//             </div>
//           )}
//         </CardContent>
//       </Card>
//     )
//   }

//   return (
//     <div className="space-y-6">
//       {/* Lightweight branded header section */}
//       <header className="rounded-lg border border-border bg-card p-4">
//         <h2 className="text-lg font-semibold text-foreground text-balance">Excel Comparator</h2>
//         <p className="text-sm text-muted-foreground">
//           Upload two spreadsheets, compare cell-by-cell, filter differences, and export a report.
//         </p>
//       </header>

//       {/* Upload Section */}
//       <div className="grid gap-6 md:grid-cols-2">
//         <FileUploadCard
//           fileNumber={1}
//           file={file1}
//           sheets={sheets1}
//           selectedSheet={selectedSheet1}
//           onFileUpload={handleFileUpload}
//           onSheetChange={handleSheetChange}
//         />
//         <FileUploadCard
//           fileNumber={2}
//           file={file2}
//           sheets={sheets2}
//           selectedSheet={selectedSheet2}
//           onFileUpload={handleFileUpload}
//           onSheetChange={handleSheetChange}
//         />
//       </div>

//       {/* Actions */}
//       {file1 && file2 && (
//         <div className="flex flex-wrap items-center justify-center gap-3">
//           <Button onClick={compareData} disabled={loading} aria-busy={loading} aria-live="polite">
//             {loading ? "Comparing…" : "Compare Files"}
//           </Button>
//           <Button variant="secondary" onClick={clearAll}>
//             <Trash2 className="mr-2 h-4 w-4" />
//             Clear All
//           </Button>
//         </div>
//       )}

//       {/* Stats + controls */}
//       {comparisonStats && (
//         <Card>
//           <CardHeader>
//             <CardTitle>Comparison Results</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//               <div className="rounded-md border border-border p-4 text-center">
//                 <div className="text-xl font-semibold text-foreground">{comparisonStats.matches}</div>
//                 <div className="text-xs text-muted-foreground">Matches</div>
//               </div>
//               <div className="rounded-md border border-border p-4 text-center">
//                 <div className="text-xl font-semibold text-destructive">{comparisonStats.differences}</div>
//                 <div className="text-xs text-muted-foreground">Differences</div>
//               </div>
//               <div className="rounded-md border border-border p-4 text-center">
//                 <div className="text-xl font-semibold text-primary">{comparisonStats.totalCells}</div>
//                 <div className="text-xs text-muted-foreground">Total Cells</div>
//               </div>
//               <div className="rounded-md border border-border p-4 text-center">
//                 <div className="text-xl font-semibold">{comparisonStats.accuracy}%</div>
//                 <div className="text-xs text-muted-foreground">Accuracy</div>
//               </div>
//             </div>

//             <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
//               <div className="flex items-center gap-4">
//                 <div className="flex items-center gap-2">
//                   <Switch
//                     id="differences-only"
//                     checked={showDifferencesOnly}
//                     onCheckedChange={(val) => setShowDifferencesOnly(Boolean(val))}
//                   />
//                   <Label htmlFor="differences-only">Show only differences</Label>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <Switch id="dense" checked={dense} onCheckedChange={(v) => setDense(Boolean(v))} />
//                   <Label htmlFor="dense">Compact rows</Label>
//                 </div>
//               </div>
//               <div className="flex items-center gap-3 text-xs text-muted-foreground">
//                 <span className="inline-flex items-center gap-2">
//                   <span className="h-3 w-3 rounded-[4px] bg-destructive/20 border border-destructive" />
//                   Difference
//                 </span>
//                 <span className="inline-flex items-center gap-2">
//                   <span className="h-3 w-3 rounded-[4px] bg-card border border-border" />
//                   Same
//                 </span>
//                 <Button size="sm" onClick={exportComparison}>
//                   <Download className="mr-2 h-4 w-4" />
//                   Export
//                 </Button>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       {/* Table */}
//       {comparison && (
//         <Card className="overflow-hidden">
//           {/* Stronger section header separation */}
//           <div className="px-4 py-3 border-b border-border">
//             <h3 className="text-sm font-medium text-foreground">Comparison View</h3>
//             <p className="text-xs text-muted-foreground">Cells with differences are highlighted.</p>
//           </div>
//           <div className="overflow-auto max-h-[28rem]">
//             <table className="w-full">
//               {/* Translucent sticky header with backdrop blur for readability */}
//               <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
//                 <tr>
//                   <th
//                     scope="col"
//                     className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-muted-foreground border border-border"
//                   >
//                     Row
//                   </th>
//                   {comparison[0]?.map((_, colIndex) => (
//                     <th
//                       key={colIndex}
//                       scope="col"
//                       className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-muted-foreground border border-border"
//                     >
//                       {XLSX.utils.encode_col(colIndex)}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {getVisibleRows().map((row, rowIndex) => {
//                   const actualRowIndex = showDifferencesOnly
//                     ? (comparison as ComparisonRow[]).findIndex((r) => r === row)
//                     : rowIndex
//                   return (
//                     <tr key={actualRowIndex} className="odd:bg-muted/10 hover:bg-muted/40 transition-colors">
//                       <td
//                         className={[
//                           dense ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm",
//                           "font-medium border border-border bg-muted/30 sticky left-0 z-10",
//                         ].join(" ")}
//                       >
//                         {actualRowIndex + 1}
//                       </td>
//                       {row.map((cell, colIndex) => {
//                         const different = cell.isDifferent && !cell.isEmpty
//                         return (
//                           <td
//                             key={colIndex}
//                             className={[
//                               dense ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm",
//                               "align-top border border-border",
//                               different
//                                 ? "bg-destructive/10 text-foreground border-l-2 border-destructive"
//                                 : "text-foreground",
//                             ].join(" ")}
//                           >
//                             <div className="space-y-1">
//                               <div className="font-medium break-words">{String(cell.value1 ?? "")}</div>
//                               {different && (
//                                 <div className="text-xs text-muted-foreground border-t border-border pt-1 break-words">
//                                   {String(cell.value2 ?? "")}
//                                 </div>
//                               )}
//                             </div>
//                           </td>
//                         )
//                       })}
//                     </tr>
//                   )
//                 })}
//               </tbody>
//             </table>
//           </div>
//         </Card>
//       )}

//       {/* Helper */}
//       {!file1 && !file2 && (
//         <Card>
//           <CardContent className="pt-6">
//             <div className="flex items-start gap-3">
//               <Eye className="h-5 w-5 text-primary mt-0.5" />
//               <div>
//                 <h4 className="font-medium">How to use</h4>
//                 <ul className="text-sm text-muted-foreground mt-1 list-disc pl-4 space-y-1">
//                   <li>Upload two spreadsheets (.xlsx, .xls, or .csv)</li>
//                   <li>Select the sheets to compare when applicable</li>
//                   <li>Click Compare Files to analyze differences</li>
//                   <li>Use Show only differences to filter changed rows</li>
//                   <li>Export the results as a new Excel file</li>
//                 </ul>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       )}
//     </div>
//   )
// }

// export default ExcelComparator
"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import {
  FileSpreadsheet,
  CheckCircle,
  Download,
  Trash2,
  Eye,
  AlertCircle,
  Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

type CellValue = string | number | boolean | null | undefined;
type SheetRow = CellValue[];
type ComparisonCell = {
  v1: string;
  v2: string;
  diff: boolean;
};
type Stats = {
  differences: number;
  matches: number;
  totalCells: number;
  accuracy: number;
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const CHUNK_SIZE = 100;

const ExcelComparator = () => {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [data1, setData1] = useState<SheetRow[] | null>(null);
  const [data2, setData2] = useState<SheetRow[] | null>(null);
  const [comparison, setComparison] = useState<ComparisonCell[][] | null>(null);
  const [selectedSheet1, setSelectedSheet1] = useState("");
  const [selectedSheet2, setSelectedSheet2] = useState("");
  const [sheets1, setSheets1] = useState<string[]>([]);
  const [sheets2, setSheets2] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const [comparisonStats, setComparisonStats] = useState<Stats | null>(null);
  const [dense, setDense] = useState(false);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const normalizeValue = (val: CellValue): string => {
    if (val === null || val === undefined || val === "") return "";
    const str = String(val).trim();
    if (str === "") return "";
    return str.replace(/\s+/g, " ").toLowerCase();
  };

  const getDisplayValue = (val: CellValue): string => {
    if (val === null || val === undefined || val === "") return "";
    return String(val).trim();
  };

  const handleFileUpload = useCallback(
    async (file: File | undefined, fileNumber: 1 | 2) => {
      if (!file) return;

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          variant: "destructive",
        });
        return;
      }

      const validExtensions = /\.(xlsx|xls|csv)$/i;
      if (!validExtensions.test(file.name)) {
        toast({
          title: "Invalid file type",
          description: "Please upload .xlsx, .xls, or .csv files only",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      setProgress(0);

      try {
        const arrayBuffer = await file.arrayBuffer();

        setProgress(30);

        const workbook = XLSX.read(arrayBuffer, {
          type: "array",
          cellDates: false,
          cellStyles: false,
          sheetStubs: false,
        });

        setProgress(60);

        const sheetNames = workbook.SheetNames;

        if (!sheetNames.length) {
          toast({
            title: "No sheets found",
            description: "The file doesn't contain any sheets",
            variant: "destructive",
          });
          return;
        }

        const firstSheet = sheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];

        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
          blankrows: false,
        }) as SheetRow[];

        setProgress(90);

        if (fileNumber === 1) {
          setFile1(file);
          setSheets1(sheetNames);
          setSelectedSheet1(firstSheet);
          setData1(jsonData);
        } else {
          setFile2(file);
          setSheets2(sheetNames);
          setSelectedSheet2(firstSheet);
          setData2(jsonData);
        }

        setProgress(100);

        toast({
          title: "Success",
          description: `${file.name} loaded (${jsonData.length} rows)`,
        });
      } catch (error) {
        console.error("File upload error:", error);
        toast({
          title: "Upload failed",
          description:
            error instanceof Error ? error.message : "Failed to read file",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setProgress(0);
      }
    },
    [toast]
  );

  const handleSheetChange = useCallback(
    async (sheetName: string, fileNumber: 1 | 2) => {
      if (!sheetName) return;
      setLoading(true);

      try {
        const file = fileNumber === 1 ? file1 : file2;
        if (!file) return;

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
          throw new Error("Sheet not found");
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
          blankrows: false,
        }) as SheetRow[];

        if (fileNumber === 1) {
          setSelectedSheet1(sheetName);
          setData1(jsonData);
        } else {
          setSelectedSheet2(sheetName);
          setData2(jsonData);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load sheet",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [file1, file2, toast]
  );

  const compareDataInChunks = useCallback(
    async (
      arr1: SheetRow[],
      arr2: SheetRow[],
      maxCols: number
    ): Promise<{ result: ComparisonCell[][]; stats: Stats }> => {
      return new Promise((resolve, reject) => {
        const maxRows = Math.max(arr1.length, arr2.length);
        const comparisonResult: ComparisonCell[][] = [];
        let differences = 0;
        let matches = 0;
        let totalCells = 0;
        let currentRow = 0;

        const processChunk = () => {
          try {
            const endRow = Math.min(currentRow + CHUNK_SIZE, maxRows);

            for (let i = currentRow; i < endRow; i++) {
              const row: ComparisonCell[] = [];
              const row1 = arr1[i] || [];
              const row2 = arr2[i] || [];

              for (let j = 0; j < maxCols; j++) {
                const v1 = getDisplayValue(row1[j]);
                const v2 = getDisplayValue(row2[j]);

                const norm1 = normalizeValue(row1[j]);
                const norm2 = normalizeValue(row2[j]);

                const isEmpty = norm1 === "" && norm2 === "";
                const isDiff = norm1 !== norm2;

                if (!isEmpty) {
                  if (isDiff) differences++;
                  else matches++;
                  totalCells++;
                }

                row.push({ v1, v2, diff: isDiff && !isEmpty });
              }
              comparisonResult.push(row);
            }

            currentRow = endRow;
            const progressPercent = Math.round((currentRow / maxRows) * 100);
            setProgress(progressPercent);

            if (currentRow < maxRows) {
              setTimeout(processChunk, 0);
            } else {
              const relevantCells =
                totalCells - (totalCells - matches - differences);
              const accuracy =
                relevantCells > 0 ? (matches / relevantCells) * 100 : 100;

              resolve({
                result: comparisonResult,
                stats: {
                  differences,
                  matches,
                  totalCells,
                  accuracy: Math.round(accuracy * 100) / 100,
                },
              });
            }
          } catch (error) {
            reject(error);
          }
        };

        processChunk();
      });
    },
    []
  );

  const compareData = useCallback(async () => {
    if (!data1 || !data2) return;

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setProgress(0);
    setComparison(null);
    setComparisonStats(null);

    try {
      const maxCols = Math.max(
        Math.max(...data1.map((r) => r.length), 0),
        Math.max(...data2.map((r) => r.length), 0)
      );

      const { result, stats } = await compareDataInChunks(
        data1,
        data2,
        maxCols
      );

      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setComparison(result);
      setComparisonStats(stats);

      toast({
        title: "Comparison complete",
        description: `Found ${stats.differences} differences`,
      });
    } catch (error) {
      console.error("Comparison error:", error);
      toast({
        title: "Comparison failed",
        description: "An error occurred during comparison",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [data1, data2, compareDataInChunks, toast]);

  // const exportComparison = useCallback(() => {
  //   if (!comparison || !data1) return

  //   try {
  //     const exportData: any[] = []
  //     const firstRow = comparison[0]
  //     const hasHeaders = firstRow?.every(c => !c.diff) ?? false
  //     const headers: string[] = []

  //     if (hasHeaders && firstRow) {
  //       firstRow.forEach((cell, idx) => {
  //         headers[idx] = cell.v1 || XLSX.utils.encode_col(idx)
  //       })
  //     }

  //     const startRow = hasHeaders ? 1 : 0

  //     for (let rowIndex = startRow; rowIndex < comparison.length; rowIndex++) {
  //       const row = comparison[rowIndex]
  //       const rowDiffs: any[] = []

  //       let recordNo = ""
  //       for (let i = 0; i < Math.min(3, row.length); i++) {
  //         const val = row[i]?.v1 || ""
  //         if (val) {
  //           recordNo = val
  //           break
  //         }
  //       }

  //       row.forEach((cell, colIndex) => {
  //         if (cell.diff) {
  //           const fieldName = hasHeaders && headers[colIndex]
  //             ? headers[colIndex]
  //             : `Col ${XLSX.utils.encode_col(colIndex)}`

  //           rowDiffs.push({
  //             field: fieldName,
  //             expected: cell.v1 || "(empty)",
  //             actual: cell.v2 || "(empty)"
  //           })
  //         }
  //       })

  //       if (rowDiffs.length > 0) {
  //         rowDiffs.forEach((diff, idx) => {
  //           exportData.push({
  //             "Record": idx === 0 ? recordNo : "",
  //             "Row": idx === 0 ? String(rowIndex + 1) : "",
  //             "Field": diff.field,
  //             "Given": diff.expected,
  //             "Entered": diff.actual
  //           })
  //         })
  //         exportData.push({ "Record": "", "Row": "", "Field": "", "Given": "", "Entered": "" })
  //       }
  //     }

  //     if (exportData.length === 0) {
  //       exportData.push({
  //         "Record": "",
  //         "Row": "",
  //         "Field": "✓ No differences - Files match!",
  //         "Given": "",
  //         "Entered": ""
  //       })
  //     } else if (comparisonStats) {
  //       exportData.push({ "Record": "", "Row": "", "Field": "", "Given": "", "Entered": "" })
  //       exportData.push({
  //         "Record": "SUMMARY",
  //         "Row": "",
  //         "Field": `Total: ${comparisonStats.totalCells}`,
  //         "Given": `Matches: ${comparisonStats.matches}`,
  //         "Entered": `Diffs: ${comparisonStats.differences}`
  //       })
  //       exportData.push({
  //         "Record": "",
  //         "Row": "",
  //         "Field": `Accuracy: ${comparisonStats.accuracy}%`,
  //         "Given": "",
  //         "Entered": ""
  //       })
  //     }

  //     const ws = XLSX.utils.json_to_sheet(exportData)
  //     ws["!cols"] = [{ wch: 18 }, { wch: 8 }, { wch: 30 }, { wch: 40 }, { wch: 40 }]

  //     const wb = XLSX.utils.book_new()
  //     XLSX.utils.book_append_sheet(wb, ws, "Comparison")

  //     const date = new Date().toISOString().slice(0, 10)
  //     XLSX.writeFile(wb, `comparison_${date}.xlsx`)

  //     toast({
  //       title: "Export successful",
  //       description: `Report saved`,
  //     })
  //   } catch (error) {
  //     toast({
  //       title: "Export failed",
  //       description: "Could not export results",
  //       variant: "destructive",
  //     })
  //   }
  // }, [comparison, data1, comparisonStats, toast])

  const exportComparison = useCallback(() => {
    if (!comparison || !data1) return;

    const isHeaderRow = (row: SheetRow): boolean => {
      if (!row || row.length === 0) return false;
      const nonEmptyCount = row.filter(
        (cell) => typeof cell === "string" && String(cell).trim().length > 0
      ).length;
      const threshold = Math.ceil(row.length * 0.6); // at least 60% should be non-empty strings
      return nonEmptyCount >= threshold;
    };

    const normalizeHeader = (val: CellValue): string => {
      return String(val || "")
        .trim()
        .replace(/\s+/g, " ");
    };

    try {
      const exportData: any[] = [];

      const firstDataRow = data1[0] || [];
      const hasHeaders = isHeaderRow(firstDataRow);
      const headers: string[] = [];

      if (hasHeaders) {
        firstDataRow.forEach((cell, idx) => {
          headers[idx] = normalizeHeader(cell) || XLSX.utils.encode_col(idx);
        });
      }

      const startRow = hasHeaders ? 1 : 0;

      for (let rowIndex = startRow; rowIndex < comparison.length; rowIndex++) {
        const row = comparison[rowIndex];
        const rowDiffs: any[] = [];

        let recordNo = "";
        for (let i = 0; i < Math.min(3, row.length); i++) {
          const val = row[i]?.v1 || "";
          if (val) {
            recordNo = val;
            break;
          }
        }

        row.forEach((cell, colIndex) => {
          if (cell.diff) {
            const fieldName =
              hasHeaders && headers[colIndex]
                ? headers[colIndex]
                : `Col ${XLSX.utils.encode_col(colIndex)}`;

            rowDiffs.push({
              field: fieldName,
              expected: cell.v1 || "(empty)",
              actual: cell.v2 || "(empty)",
            });
          }
        });

        if (rowDiffs.length > 0) {
          rowDiffs.forEach((diff, idx) => {
            exportData.push({
              Record: idx === 0 ? recordNo : "",
              Row: idx === 0 ? String(rowIndex + 1) : "",
              Field: diff.field,
              Given: diff.expected,
              Entered: diff.actual,
            });
          });
          exportData.push({
            Record: "",
            Row: "",
            Field: "",
            Given: "",
            Entered: "",
          });
        }
      }

      // Add summary or no-difference message
      if (exportData.length === 0) {
        exportData.push({
          Record: "",
          Row: "",
          Field: "✓ No differences - Files match!",
          Given: "",
          Entered: "",
        });
      } else if (comparisonStats) {
        exportData.push({
          Record: "",
          Row: "",
          Field: "",
          Given: "",
          Entered: "",
        });
        exportData.push({
          Record: "SUMMARY",
          Row: "",
          Field: `Total: ${comparisonStats.totalCells}`,
          Given: `Matches: ${comparisonStats.matches}`,
          Entered: `Diffs: ${comparisonStats.differences}`,
        });
        exportData.push({
          Record: "",
          Row: "",
          Field: `Accuracy: ${comparisonStats.accuracy}%`,
          Given: "",
          Entered: "",
        });
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 18 },
        { wch: 8 },
        { wch: 30 },
        { wch: 40 },
        { wch: 40 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Comparison");

      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `comparison_${date}.xlsx`);

      toast({
        title: "Export successful",
        description: `Report saved`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export results",
        variant: "destructive",
      });
    }
  }, [comparison, data1, comparisonStats, toast]);

  const clearAll = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setFile1(null);
    setFile2(null);
    setData1(null);
    setData2(null);
    setComparison(null);
    setSelectedSheet1("");
    setSelectedSheet2("");
    setSheets1([]);
    setSheets2([]);
    setComparisonStats(null);
    setShowDifferencesOnly(false);
    setDense(false);
    setProgress(0);
  };

  const visibleRows = useMemo(() => {
    if (!comparison) return [];
    if (!showDifferencesOnly) return comparison;
    return comparison.filter((row) => row.some((c) => c.diff));
  }, [comparison, showDifferencesOnly]);

  const FileUploadCard = ({
    fileNumber,
    file,
    sheets,
    selectedSheet,
    onFileUpload,
    onSheetChange,
  }: {
    fileNumber: 1 | 2;
    file: File | null;
    sheets: string[];
    selectedSheet: string;
    onFileUpload: (file: File | undefined, fileNumber: 1 | 2) => void;
    onSheetChange: (sheet: string, fileNumber: 1 | 2) => void;
  }) => {
    const [dragOver, setDragOver] = useState(false);

    return (
      <Card
        className={`border transition ${dragOver ? "ring-2 ring-primary" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onFileUpload(e.dataTransfer?.files?.[0], fileNumber);
        }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-5 w-5" />
            File {fileNumber}{" "}
            {fileNumber === 1 ? "( Correct )" : "( Incorrect )"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!file ? (
            <>
              <div className="w-full rounded border-2 border-dashed p-8 text-center text-sm text-muted-foreground hover:bg-accent/5 cursor-pointer">
                <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>
                  Drop file or{" "}
                  <label
                    htmlFor={`f${fileNumber}`}
                    className="text-primary cursor-pointer underline"
                  >
                    browse
                  </label>
                </p>
              </div>
              <Input
                id={`f${fileNumber}`}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => onFileUpload(e.target.files?.[0], fileNumber)}
              />
              <p className="text-xs text-muted-foreground">Max 50MB</p>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-primary/5 p-3 rounded">
                <CheckCircle className="h-5 w-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              {sheets.length > 1 && (
                <>
                  <Label>Sheet</Label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => onSheetChange(e.target.value, fileNumber)}
                    className="w-full rounded border bg-background px-3 py-2 text-sm"
                  >
                    {sheets.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 pb-8 max-w-7xl mx-auto px-4">
      <header className="rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 p-6">
        <h1 className="text-2xl font-bold">Excel Comparator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compare spreadsheets efficiently
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <FileUploadCard
          fileNumber={1}
          file={file1}
          sheets={sheets1}
          selectedSheet={selectedSheet1}
          onFileUpload={handleFileUpload}
          onSheetChange={handleSheetChange}
        />
        <FileUploadCard
          fileNumber={2}
          file={file2}
          sheets={sheets2}
          selectedSheet={selectedSheet2}
          onFileUpload={handleFileUpload}
          onSheetChange={handleSheetChange}
        />
      </div>

      {loading && progress > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>Processing...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {file1 && file2 && !loading && (
        <div className="flex justify-center gap-3">
          <Button onClick={compareData} size="lg">
            Compare Files
          </Button>
          <Button variant="outline" onClick={clearAll}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      )}

      {comparisonStats && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="rounded border p-4 text-center bg-green-50 dark:bg-green-950/20">
                  <div className="text-2xl font-bold text-green-600">
                    {comparisonStats.matches}
                  </div>
                  <div className="text-xs text-muted-foreground">Matches</div>
                </div>
                <div className="rounded border p-4 text-center bg-red-50 dark:bg-red-950/20">
                  <div className="text-2xl font-bold text-red-600">
                    {comparisonStats.differences}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Differences
                  </div>
                </div>
                <div className="rounded border p-4 text-center bg-blue-50 dark:bg-blue-950/20">
                  <div className="text-2xl font-bold text-blue-600">
                    {comparisonStats.totalCells}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="rounded border p-4 text-center bg-amber-50 dark:bg-amber-950/20">
                  <div className="text-2xl font-bold text-amber-600">
                    {comparisonStats.accuracy}%
                  </div>
                  <div className="text-xs text-muted-foreground">Accuracy</div>
                </div>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="diff"
                      checked={showDifferencesOnly}
                      onCheckedChange={setShowDifferencesOnly}
                    />
                    <Label htmlFor="diff" className="text-sm cursor-pointer">
                      Differences only
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="dense"
                      checked={dense}
                      onCheckedChange={setDense}
                    />
                    <Label htmlFor="dense" className="text-sm cursor-pointer">
                      Compact
                    </Label>
                  </div>
                </div>
                <Button onClick={exportComparison} size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {visibleRows.length > 1000 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Showing first 1000 rows. Export to see all.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {comparison && visibleRows.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base">Comparison View</CardTitle>
          </CardHeader>
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold border">
                    Row
                  </th>
                  {comparison[0]?.map((_, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left text-xs font-semibold border"
                    >
                      {XLSX.utils.encode_col(i)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.slice(0, 1000).map((row, idx) => {
                  const actualIdx = showDifferencesOnly
                    ? comparison.findIndex((r) => r === row)
                    : idx;
                  return (
                    <tr key={actualIdx} className="hover:bg-muted/20">
                      <td
                        className={`${
                          dense ? "px-2 py-1 text-xs" : "px-3 py-2"
                        } font-semibold border bg-muted/40`}
                      >
                        {actualIdx + 1}
                      </td>
                      {row.map((cell, colIdx) => (
                        <td
                          key={colIdx}
                          className={`${
                            dense ? "px-2 py-1 text-xs" : "px-3 py-2"
                          } border align-top ${
                            cell.diff
                              ? "bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500"
                              : ""
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="font-medium break-words">
                              {cell.v1 || (
                                <span className="text-muted-foreground italic text-xs">
                                  empty
                                </span>
                              )}
                            </div>
                            {cell.diff && (
                              <div className="text-xs text-red-600 dark:text-red-400 border-t pt-1 mt-1 break-words font-medium">
                                {cell.v2 || (
                                  <span className="italic text-muted-foreground">
                                    empty
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!file1 && !file2 && (
        <Card className="border-dashed border-2">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Eye className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold mb-2">How to use</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-4">
                  <li>Upload two Excel/CSV files</li>
                  <li>Click Compare Files</li>
                  <li>Review differences</li>
                  <li>Export report</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-3">
                  ✓ Handles 1000+ rows efficiently
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExcelComparator;
