"use client";

import { useState, useCallback } from "react";
import {
  FileSpreadsheet,
  CheckCircle,
  Download,
  Trash2,
  Eye,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

type SheetRow = Array<string | number | boolean | null>;
type ComparisonCell = {
  value1: unknown;
  value2: unknown;
  isDifferent: boolean;
  isEmpty: boolean;
};
type ComparisonRow = ComparisonCell[];
type Stats = {
  differences: number;
  matches: number;
  totalCells: number;
  accuracy: string | number;
};

const ExcelComparator = () => {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [data1, setData1] = useState<SheetRow[] | null>(null);
  const [data2, setData2] = useState<SheetRow[] | null>(null);
  const [comparison, setComparison] = useState<ComparisonRow[] | null>(null);
  const [selectedSheet1, setSelectedSheet1] = useState("");
  const [selectedSheet2, setSelectedSheet2] = useState("");
  const [sheets1, setSheets1] = useState<string[]>([]);
  const [sheets2, setSheets2] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const [comparisonStats, setComparisonStats] = useState<Stats | null>(null);
  const [dense, setDense] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = useCallback(
    async (file: File | undefined, fileNumber: 1 | 2) => {
      if (!file) return;
      setLoading(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetNames = workbook.SheetNames;

        const firstSheet = sheetNames[0];
        if (!firstSheet) {
          toast({
            title: "No sheets found",
            description: "Please upload a valid spreadsheet.",
            variant: "destructive",
          });
          return;
        }

        const worksheet = workbook.Sheets[firstSheet];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
        }) as SheetRow[];

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
      } catch (error) {
        console.error(" Error reading file:", error);
        toast({
          title: "File error",
          description: "Unable to read the Excel file.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
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
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
        }) as SheetRow[];

        if (fileNumber === 1) {
          setSelectedSheet1(sheetName);
          setData1(jsonData);
        } else {
          setSelectedSheet2(sheetName);
          setData2(jsonData);
        }
      } catch (error) {
        console.error(" Error reading sheet:", error);
        toast({
          title: "Sheet error",
          description: "Unable to read the selected sheet.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [file1, file2, toast]
  );

  const compareData = useCallback(() => {
    if (!data1 || !data2) return;
    setLoading(true);

    const maxRows = Math.max(data1.length, data2.length);
    const maxCols = Math.max(
      Math.max(...data1.map((row) => row.length)),
      Math.max(...data2.map((row) => row.length))
    );

    const comparisonResult = [];
    let differences = 0;
    let matches = 0;
    let totalCells = 0;

    for (let i = 0; i < maxRows; i++) {
      const row = [];
      const row1 = data1[i] || [];
      const row2 = data2[i] || [];

      for (let j = 0; j < maxCols; j++) {
        const cell1 = row1[j] ?? "";
        const cell2 = row2[j] ?? "";
        const isDifferent = String(cell1) !== String(cell2);

        if (isDifferent) differences++;
        else matches++;
        totalCells++;

        row.push({
          value1: cell1,
          value2: cell2,
          isDifferent,
          isEmpty: cell1 === "" && cell2 === "",
        });
      }
      comparisonResult.push(row);
    }

    setComparison(comparisonResult);
    setComparisonStats({
      differences,
      matches,
      totalCells,
      accuracy: totalCells > 0 ? ((matches / totalCells) * 100).toFixed(2) : 0,
    });
    setLoading(false);
  }, [data1, data2]);

  const exportComparison = () => {
    if (!comparison || comparison.length === 0) return;

    const firstRow = comparison[0];
    const hasHeaders = firstRow?.every(
      (cell) => cell.value1 === cell.value2 && !cell.isDifferent
    );

    const headers: string[] = [];
    if (hasHeaders && firstRow) {
      firstRow.forEach((cell, colIndex) => {
        const headerValue = String(cell.value1 ?? "").trim();
        headers[colIndex] = headerValue || XLSX.utils.encode_col(colIndex);
      });
    }

    const exportData: Array<{ Field: string; Given: string; Entered: string }> =
      [];

    const startRow = hasHeaders ? 1 : 0;

    for (let rowIndex = startRow; rowIndex < comparison.length; rowIndex++) {
      const row = comparison[rowIndex];
      if (!row) continue;

      // Check if this row has any differences
      const hasDifferences = row.some(
        (cell) => cell.isDifferent && !cell.isEmpty
      );

      if (hasDifferences) {
        row.forEach((cell, colIndex) => {
          if (cell.isDifferent && !cell.isEmpty) {
            let fieldName: string;

            if (hasHeaders && headers[colIndex]) {
              fieldName = headers[colIndex];
            } else {
              const colLetter = XLSX.utils.encode_col(colIndex);
              fieldName = `Column ${colLetter}`;
            }

            exportData.push({
              Field: fieldName,
              Given: String(cell.value1 ?? "").trim(),
              Entered: String(cell.value2 ?? "").trim(),
            });
          }
        });

        // Add a blank row after each compared row for spacing
        exportData.push({ Field: "", Given: "", Entered: "" });
      }
    }

        if (exportData.length === 0) {
      exportData.push({
        Field: "No differences found",
        Given: "",
        Entered: "",
      });
    } else if (comparisonStats) {
      exportData.push({ Field: "", Given: "", Entered: "" }); // spacing
      exportData.push({
        Field: `You got ${comparisonStats.matches} out of ${comparisonStats.totalCells} correct.`,
        Given: `Accuracy: ${comparisonStats.accuracy}%`,
        Entered: "",
      });
    }

    const ws = XLSX.utils.json_to_sheet(exportData);

    const colWidths = [
      { wch: Math.max(20, ...exportData.map((r) => r.Field.length)) },
      { wch: Math.max(15, ...exportData.map((r) => r.Given.length)) },
      { wch: Math.max(15, ...exportData.map((r) => r.Entered.length)) },
    ];
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comparison");

    try {
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "excel_comparison_result.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  const clearAll = () => {
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
  };

  const getVisibleRows = () => {
    if (!comparison) return [];
    if (!showDifferencesOnly) return comparison;
    return comparison.filter((row) =>
      row.some((cell) => cell.isDifferent && !cell.isEmpty)
    );
  };

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
        className={[
          "border border-border transition-colors",
          dragOver ? "ring-2 ring-primary" : "",
        ].join(" ")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const dropped = e.dataTransfer?.files?.[0];
          if (dropped) onFileUpload(dropped, fileNumber);
        }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {fileNumber == 1 ? "Correct" : "Incorrect"} File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!file ? (
            <div className="flex flex-col items-start gap-2 w-full">
              <Label htmlFor={`file-${fileNumber}`} className="sr-only">
                Upload file {fileNumber}
              </Label>
              <div
                className={[
                  "w-full rounded-md border border-dashed border-input bg-background/60",
                  "px-3 py-8 text-center text-sm text-muted-foreground",
                ].join(" ")}
              >
                Drag & drop a file here or
                <span className="mx-1 font-medium text-foreground">browse</span>
              </div>
              <Input
                id={`file-${fileNumber}`}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => onFileUpload(e.target.files?.[0], fileNumber)}
              />
              <p className="text-xs text-muted-foreground">
                Accepted: .xlsx, .xls, .csv
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center text-foreground">
                <CheckCircle className="mr-2 h-5 w-5 text-primary" />
                <span className="font-medium">{file.name}</span>
              </div>

              {sheets.length > 1 && (
                <div className="grid gap-2">
                  <Label htmlFor={`sheet-${fileNumber}`}>Select sheet</Label>
                  <select
                    id={`sheet-${fileNumber}`}
                    value={selectedSheet}
                    onChange={(e) => onSheetChange(e.target.value, fileNumber)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    {sheets.map((sheet) => (
                      <option key={sheet} value={sheet}>
                        {sheet}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
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

      {/* Actions */}
      {file1 && file2 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={compareData} disabled={loading}>
            {loading ? "Comparing…" : "Compare Files"}
          </Button>
          <Button variant="secondary" onClick={clearAll}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        </div>
      )}

      {/* Stats + controls */}
      {comparisonStats && (
        <Card>
          <CardHeader>
            <CardTitle>Comparison Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-md border border-border p-4 text-center">
                <div className="text-xl font-semibold text-foreground">
                  {comparisonStats.matches}
                </div>
                <div className="text-xs text-muted-foreground">Matches</div>
              </div>
              <div className="rounded-md border border-border p-4 text-center">
                <div className="text-xl font-semibold text-destructive">
                  {comparisonStats.differences}
                </div>
                <div className="text-xs text-muted-foreground">Differences</div>
              </div>
              <div className="rounded-md border border-border p-4 text-center">
                <div className="text-xl font-semibold text-primary">
                  {comparisonStats.totalCells}
                </div>
                <div className="text-xs text-muted-foreground">Total Cells</div>
              </div>
              <div className="rounded-md border border-border p-4 text-center">
                <div className="text-xl font-semibold">
                  {comparisonStats.accuracy}%
                </div>
                <div className="text-xs text-muted-foreground">Accuracy</div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="differences-only"
                    checked={showDifferencesOnly}
                    onCheckedChange={(val) =>
                      setShowDifferencesOnly(Boolean(val))
                    }
                  />
                  <Label htmlFor="differences-only">
                    Show only differences
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="dense"
                    checked={dense}
                    onCheckedChange={(v) => setDense(Boolean(v))}
                  />
                  <Label htmlFor="dense">Compact rows</Label>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-[4px] bg-destructive/20 border border-destructive" />
                  Difference
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-[4px] bg-card border border-border" />
                  Same
                </span>
                <Button size="sm" onClick={exportComparison}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {comparison && (
        <Card className="overflow-hidden">
          {/* Stronger section header separation */}
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">
              Comparison View
            </h3>
            <p className="text-xs text-muted-foreground">
              Cells with differences are highlighted.
            </p>
          </div>
          <div className="overflow-auto max-h-[28rem]">
            <table className="w-full">
              {/* Translucent sticky header with backdrop blur for readability */}
              <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-muted-foreground border border-border"
                  >
                    Row
                  </th>
                  {comparison[0]?.map((_, colIndex) => (
                    <th
                      key={colIndex}
                      scope="col"
                      className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-muted-foreground border border-border"
                    >
                      {XLSX.utils.encode_col(colIndex)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getVisibleRows().map((row, rowIndex) => {
                  const actualRowIndex = showDifferencesOnly
                    ? (comparison as ComparisonRow[]).findIndex(
                        (r) => r === row
                      )
                    : rowIndex;
                  return (
                    <tr
                      key={actualRowIndex}
                      className="odd:bg-muted/10 hover:bg-muted/40 transition-colors"
                    >
                      <td
                        className={[
                          dense ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm",
                          "font-medium border border-border bg-muted/30 sticky left-0 z-10",
                        ].join(" ")}
                      >
                        {actualRowIndex + 1}
                      </td>
                      {row.map((cell, colIndex) => {
                        const different = cell.isDifferent && !cell.isEmpty;
                        return (
                          <td
                            key={colIndex}
                            className={[
                              dense ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm",
                              "align-top border border-border",
                              different
                                ? "bg-destructive/10 text-foreground"
                                : "text-foreground",
                            ].join(" ")}
                          >
                            <div className="space-y-1">
                              <div className="font-medium break-words">
                                {String(cell.value1 ?? "")}
                              </div>
                              {different && (
                                <div className="text-xs text-muted-foreground border-t border-border pt-1 break-words">
                                  {String(cell.value2 ?? "")}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Helper */}
      {!file1 && !file2 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium">How to use</h4>
                <ul className="text-sm text-muted-foreground mt-1 list-disc pl-4 space-y-1">
                  <li>Upload two spreadsheets (.xlsx, .xls, or .csv)</li>
                  <li>Select the sheets to compare when applicable</li>
                  <li>Click Compare Files to analyze differences</li>
                  <li>Use Show only differences to filter changed rows</li>
                  <li>Export the results as a new Excel file</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExcelComparator;
