// ExcelComparatorLogic.ts
import { useState, useCallback, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/components/ui/use-toast";

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
type ComparisonMode = "positional" | "key-based";
type RowMatch = {
  row1Index: number | null;
  row2Index: number | null;
  status: "matched" | "added" | "deleted";
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const CHUNK_SIZE = 100;

export const useExcelComparator = () => {
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
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("positional");
  const [keyColumns, setKeyColumns] = useState<number[]>([]);
  const [headerRow, setHeaderRow] = useState<number>(0);
  const [rowMatches, setRowMatches] = useState<RowMatch[]>([]);
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

  const compareDataKeyBased = useCallback(
    async (
      arr1: SheetRow[],
      arr2: SheetRow[],
      maxCols: number
    ): Promise<{ result: ComparisonCell[][]; stats: Stats; matches: RowMatch[] }> => {
      return new Promise((resolve, reject) => {
        try {
          const buildKeyMap = (arr: SheetRow[], startRow: number) => {
            const map = new Map<string, number>();
            for (let i = startRow; i < arr.length; i++) {
              const key = keyColumns
                .map((col) => normalizeValue(arr[i]?.[col] || ""))
                .filter((v) => v !== "")
                .join("|");
              if (key) {
                map.set(key, i);
              }
            }
            return map;
          };

          const map1 = buildKeyMap(arr1, headerRow + 1);
          const map2 = buildKeyMap(arr2, headerRow + 1);

          const allKeys = new Set([...map1.keys(), ...map2.keys()]);
          
          const matches: RowMatch[] = [];
          const comparisonResult: ComparisonCell[][] = [];
          let differences = 0;
          let matchCount = 0;
          let totalCells = 0;

          for (let i = 0; i <= headerRow; i++) {
            const row: ComparisonCell[] = [];
            const row1 = arr1[i] || [];
            const row2 = arr2[i] || [];

            for (let j = 0; j < maxCols; j++) {
              const v1 = getDisplayValue(row1[j]);
              const v2 = getDisplayValue(row2[j]);
              row.push({ v1, v2, diff: false });
            }
            comparisonResult.push(row);
          }

          allKeys.forEach((key) => {
            const idx1 = map1.get(key);
            const idx2 = map2.get(key);

            let status: "matched" | "added" | "deleted" = "matched";
            if (idx1 === undefined) status = "added";
            else if (idx2 === undefined) status = "deleted";

            matches.push({
              row1Index: idx1 ?? null,
              row2Index: idx2 ?? null,
              status,
            });

            const row: ComparisonCell[] = [];
            const row1 = idx1 !== undefined ? arr1[idx1] || [] : [];
            const row2 = idx2 !== undefined ? arr2[idx2] || [] : [];

            for (let j = 0; j < maxCols; j++) {
              const v1 = getDisplayValue(row1[j]);
              const v2 = getDisplayValue(row2[j]);

              const norm1 = normalizeValue(row1[j]);
              const norm2 = normalizeValue(row2[j]);

              const isEmpty = norm1 === "" && norm2 === "";
              const isDiff = norm1 !== norm2;

              if (status === "matched" && !isEmpty) {
                if (isDiff) differences++;
                else matchCount++;
                totalCells++;
              }

              row.push({ 
                v1, 
                v2, 
                diff: isDiff && !isEmpty && status === "matched"
              });
            }
            comparisonResult.push(row);
          });

          const relevantCells = totalCells - (totalCells - matchCount - differences);
          const accuracy = relevantCells > 0 ? (matchCount / relevantCells) * 100 : 100;

          resolve({
            result: comparisonResult,
            stats: {
              differences,
              matches: matchCount,
              totalCells,
              accuracy: Math.round(accuracy * 100) / 100,
            },
            matches,
          });
        } catch (error) {
          reject(error);
        }
      });
    },
    [keyColumns, headerRow]
  );

  const compareData = useCallback(async () => {
    if (!data1 || !data2) return;

    if (comparisonMode === "key-based" && keyColumns.length === 0) {
      toast({
        title: "No key columns selected",
        description: "Please select at least one key column for comparison",
        variant: "destructive",
      });
      return;
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setProgress(0);
    setComparison(null);
    setComparisonStats(null);
    setRowMatches([]);

    try {
      const maxCols = Math.max(
        Math.max(...data1.map((r) => r.length), 0),
        Math.max(...data2.map((r) => r.length), 0)
      );

      if (comparisonMode === "key-based") {
        const { result, stats, matches } = await compareDataKeyBased(
          data1,
          data2,
          maxCols
        );

        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        setComparison(result);
        setComparisonStats(stats);
        setRowMatches(matches);

        const addedRows = matches.filter((m) => m.status === "added").length;
        const deletedRows = matches.filter((m) => m.status === "deleted").length;

        toast({
          title: "Comparison complete",
          description: `${stats.differences} differences, ${addedRows} added, ${deletedRows} deleted rows`,
        });
      } else {
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
        setRowMatches([]);

        toast({
          title: "Comparison complete",
          description: `Found ${stats.differences} differences`,
        });
      }
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
  }, [data1, data2, comparisonMode, keyColumns, compareDataInChunks, compareDataKeyBased, toast]);

  const exportComparison = useCallback(() => {
    if (!comparison || !data1) return;

    try {
      const exportData: any[] = [];
      
      for (let rowIndex = 0; rowIndex < comparison.length; rowIndex++) {
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
            rowDiffs.push({
              field: XLSX.utils.encode_col(colIndex),
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
    setKeyColumns([]);
    setHeaderRow(0);
    setRowMatches([]);
  };

  const visibleRows = useMemo(() => {
    if (!comparison) return [];
    if (!showDifferencesOnly) return comparison;
    return comparison.filter((row) => row.some((c) => c.diff));
  }, [comparison, showDifferencesOnly]);

  return {
    // State
    file1,
    file2,
    data1,
    data2,
    comparison,
    selectedSheet1,
    selectedSheet2,
    sheets1,
    sheets2,
    loading,
    progress,
    showDifferencesOnly,
    comparisonStats,
    dense,
    comparisonMode,
    keyColumns,
    headerRow,
    rowMatches,
    visibleRows,
    
    // Setters
    setShowDifferencesOnly,
    setDense,
    setComparisonMode,
    setKeyColumns,
    setHeaderRow,
    
    // Methods
    handleFileUpload,
    handleSheetChange,
    compareData,
    exportComparison,
    clearAll,
    getDisplayValue,
  };
};