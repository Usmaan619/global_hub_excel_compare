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
  Settings,
  GitMerge,
  XCircle,
} from "lucide-react";
import * as XLSX from "xlsx-js-style";
import ExcelJS from "exceljs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CellValue = string | number | boolean | null | undefined;
type SheetRow = CellValue[];
type ComparisonCell = {
  v1: string;
  v2: string;
  diff: boolean;
  isEmpty: boolean;
  original1?: CellValue; // ✅ Add original values
  original2?: CellValue; // ✅ Add original values
};
type Stats = {
  differences: number;
  matches: number;
  totalCells: number;
  accuracy: number;
};

type CommonRowData = {
  rowIndex1: number;
  rowIndex2: number;
  data: SheetRow;
};

type MatchedRowPair = {
  row1Index: number;
  row2Index: number;
  row1Data: SheetRow;
  row2Data: SheetRow;
  matchScore?: number;
};

type UnmatchedRow = {
  rowIndex: number;
  data: SheetRow;
  keyValue: string;
};

// Advanced diff segment types for LCS algorithm
interface DiffSegment {
  text: string;
  type: "equal" | "delete" | "insert";
}

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
  const [showSettings, setShowSettings] = useState(false);
  const [sideBySideView, setSideBySideView] = useState(false);

  const [commonRows, setCommonRows] = useState<CommonRowData[] | null>(null);
  const [showCommonRows, setShowCommonRows] = useState(false);

  const [keyColumn, setKeyColumn] = useState<number>(0);
  const [matchingMode, setMatchingMode] = useState<
    "position" | "key" | "fuzzy"
  >("key");
  const [duplicateHandling, setDuplicateHandling] = useState<
    "first" | "best" | "all"
  >("best");
  const [fuzzyThreshold, setFuzzyThreshold] = useState<number>(80);

  const [matchedRows, setMatchedRows] = useState<MatchedRowPair[] | null>(null);
  const [unmatchedFile1Rows, setUnmatchedFile1Rows] = useState<UnmatchedRow[]>(
    []
  );
  const [unmatchedFile2Rows, setUnmatchedFile2Rows] = useState<UnmatchedRow[]>(
    []
  );
  const [showUnmatched, setShowUnmatched] = useState(false);

  const [caseSensitive, setCaseSensitive] = useState(false);
  const [ignoreSpaces, setIgnoreSpaces] = useState(true);
  const [trimValues, setTrimValues] = useState(true);
  const [numericPrecision, setNumericPrecision] = useState(2);

  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  // LCS Algorithm for character-level diff
  const computeLCS = (str1: string, str2: string): number[][] => {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp;
  };

  const getDiffSegments = (
    str1: string,
    str2: string
  ): {
    segments1: DiffSegment[];
    segments2: DiffSegment[];
  } => {
    const dp = computeLCS(str1, str2);
    const segments1: DiffSegment[] = [];
    const segments2: DiffSegment[] = [];

    let i = str1.length;
    let j = str2.length;

    const ops: Array<{
      type: string;
      i: number;
      j: number;
      char1?: string;
      char2?: string;
    }> = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && str1[i - 1] === str2[j - 1]) {
        ops.push({ type: "equal", i: i - 1, j: j - 1, char1: str1[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        ops.push({ type: "insert", i: i - 1, j: j - 1, char2: str2[j - 1] });
        j--;
      } else if (i > 0) {
        ops.push({ type: "delete", i: i - 1, j: j - 1, char1: str1[i - 1] });
        i--;
      }
    }

    ops.reverse();

    let currentSegment1: DiffSegment | null = null;
    let currentSegment2: DiffSegment | null = null;

    ops.forEach((op) => {
      if (op.type === "equal") {
        if (currentSegment1 && currentSegment1.type === "equal") {
          currentSegment1.text += op.char1;
        } else {
          if (currentSegment1) segments1.push(currentSegment1);
          currentSegment1 = { text: op.char1 || "", type: "equal" };
        }

        if (currentSegment2 && currentSegment2.type === "equal") {
          currentSegment2.text += op.char1;
        } else {
          if (currentSegment2) segments2.push(currentSegment2);
          currentSegment2 = { text: op.char1 || "", type: "equal" };
        }
      } else if (op.type === "delete") {
        if (currentSegment1) segments1.push(currentSegment1);
        segments1.push({ text: op.char1 || "", type: "delete" });
        currentSegment1 = null;
      } else if (op.type === "insert") {
        if (currentSegment2) segments2.push(currentSegment2);
        segments2.push({ text: op.char2 || "", type: "insert" });
        currentSegment2 = null;
      }
    });

    if (currentSegment1) segments1.push(currentSegment1);
    if (currentSegment2) segments2.push(currentSegment2);

    return { segments1, segments2 };
  };

  const createRichTextFromSegments = (
    segments: DiffSegment[],
    isCorrectValue: boolean
  ): any[] => {
    return segments.map((segment) => {
      if (segment.type === "equal") {
        return {
          text: segment.text,
          font: { color: { argb: "FF000000" } },
        };
      } else if (segment.type === "delete") {
        return {
          text: segment.text,
          font: {
            color: { argb: "FF0000FF" }, // Blue for deleted (correct but missing)
            bold: true,
          },
        };
      } else if (segment.type === "insert") {
        return {
          text: segment.text,
          font: {
            color: { argb: "FFFF0000" }, // Red for inserted (wrong/extra)
            bold: true,
          },
        };
      }
      return { text: segment.text };
    });
  };

  const normalizeValue = (val: CellValue): string => {
    if (val === null || val === undefined || val === "") return "";

    let str = String(val);

    if (trimValues) {
      str = str.trim();
    }

    if (str === "") return "";

    if (ignoreSpaces) {
      str = str.replace(/\s+/g, "");
    } else {
      str = str.replace(/\s+/g, " ");
    }

    if (!caseSensitive) {
      str = str.toLowerCase();
    }

    return str;
  };

  const areNumbersEqual = (v1: CellValue, v2: CellValue): boolean => {
    const num1 = Number(v1);
    const num2 = Number(v2);

    if (isNaN(num1) || isNaN(num2)) return false;

    const diff = Math.abs(num1 - num2);
    const threshold = Math.pow(10, -numericPrecision);

    return diff < threshold;
  };

  const getDisplayValue = (val: CellValue): string => {
    if (val === null || val === undefined || val === "") return "";
    return String(val).trim();
  };

  const getCharacterDiff = (
    str1: string,
    str2: string
  ): { text: string; added?: boolean; removed?: boolean }[] => {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const result: { text: string; added?: boolean; removed?: boolean }[] = [];
    let i = len1,
      j = len2;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && str1[i - 1] === str2[j - 1]) {
        result.unshift({ text: str1[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || matrix[i][j - 1] <= matrix[i - 1][j])) {
        result.unshift({ text: str2[j - 1], added: true });
        j--;
      } else if (i > 0) {
        result.unshift({ text: str1[i - 1], removed: true });
        i--;
      }
    }

    return result;
  };

  const levenshteinDistance = useCallback(
    (str1: string, str2: string): number => {
      const len1 = str1.length;
      const len2 = str2.length;
      const matrix: number[][] = [];

      for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
      }

      for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
      }

      for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
          if (str1[i - 1] === str2[j - 1]) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }

      return matrix[len1][len2];
    },
    []
  );

  const calculateStringSimilarity = useCallback(
    (str1: string, str2: string): number => {
      const maxLen = Math.max(str1.length, str2.length);
      if (maxLen === 0) return 100;
      const distance = levenshteinDistance(str1, str2);
      return ((maxLen - distance) / maxLen) * 100;
    },
    [levenshteinDistance]
  );

  const calculateRowSimilarity = useCallback(
    (row1: SheetRow, row2: SheetRow): number => {
      const maxLen = Math.max(row1.length, row2.length);
      let matchCount = 0;
      let totalComparisons = 0;

      for (let i = 0; i < maxLen; i++) {
        const v1 = row1[i];
        const v2 = row2[i];

        const norm1 = normalizeValue(v1);
        const norm2 = normalizeValue(v2);

        if (norm1 === "" && norm2 === "") continue;

        totalComparisons++;

        const isNum1 = !isNaN(Number(v1)) && String(v1).trim() !== "";
        const isNum2 = !isNaN(Number(v2)) && String(v2).trim() !== "";

        if (isNum1 && isNum2) {
          if (areNumbersEqual(v1, v2)) matchCount++;
        } else {
          if (norm1 === norm2) matchCount++;
        }
      }

      return totalComparisons > 0 ? (matchCount / totalComparisons) * 100 : 0;
    },
    [normalizeValue, areNumbersEqual]
  );

  const areRowsIdentical = useCallback(
    (row1: SheetRow, row2: SheetRow): boolean => {
      const maxLen = Math.max(row1.length, row2.length);

      for (let i = 0; i < maxLen; i++) {
        const v1 = row1[i];
        const v2 = row2[i];

        const norm1 = normalizeValue(v1);
        const norm2 = normalizeValue(v2);

        if (norm1 === "" && norm2 === "") continue;
        if (norm1 === "" || norm2 === "") return false;

        const isNum1 = !isNaN(Number(v1)) && String(v1).trim() !== "";
        const isNum2 = !isNaN(Number(v2)) && String(v2).trim() !== "";

        if (isNum1 && isNum2) {
          if (!areNumbersEqual(v1, v2)) return false;
        } else {
          if (norm1 !== norm2) return false;
        }
      }

      return true;
    },
    [normalizeValue, areNumbersEqual]
  );

  function lengthOfLongestSubstring(s: any) {
    let maxLength = 0;
    let start = 0;
    let charSet = new Set();

    for (let end = 0; end < s.length; end++) {
      while (charSet.has(s[end])) {
        charSet.delete(s[start]);
        start++;
      }
      charSet.add(s[end]);
      maxLength = Math.max(maxLength, end - start + 1);
    }

    return maxLength;
  }

  const matchRowsByKey = useCallback(() => {
    if (!data1 || !data2) return null;

    const matched: MatchedRowPair[] = [];
    const usedFile2Indices = new Set<number>();
    const unmatchedF1: UnmatchedRow[] = [];
    const unmatchedF2: UnmatchedRow[] = [];

    const file2Map = new Map<string, number[]>();

    for (let i = 1; i < data2.length; i++) {
      const keyValue = normalizeValue(data2[i][keyColumn]);
      if (keyValue) {
        if (!file2Map.has(keyValue)) {
          file2Map.set(keyValue, []);
        }
        file2Map.get(keyValue)!.push(i);
      }
    }

    for (let i = 1; i < data1.length; i++) {
      const keyValue = normalizeValue(data1[i][keyColumn]);

      if (!keyValue) {
        unmatchedF1.push({
          rowIndex: i,
          data: data1[i],
          keyValue: getDisplayValue(data1[i][keyColumn]),
        });
        continue;
      }

      let matched_row = false;

      if (file2Map.has(keyValue)) {
        const matchedIndices = file2Map.get(keyValue)!;

        if (duplicateHandling === "first") {
          const matchedIndex = matchedIndices[0];
          if (!usedFile2Indices.has(matchedIndex)) {
            matched.push({
              row1Index: i,
              row2Index: matchedIndex,
              row1Data: data1[i],
              row2Data: data2[matchedIndex],
              matchScore: 100,
            });
            usedFile2Indices.add(matchedIndex);
            matched_row = true;
          }
        } else if (duplicateHandling === "best") {
          let bestMatchIndex = -1;
          let bestSimilarity = -1;

          for (const idx of matchedIndices) {
            if (!usedFile2Indices.has(idx)) {
              const similarity = calculateRowSimilarity(data1[i], data2[idx]);
              if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatchIndex = idx;
              }
            }
          }

          if (bestMatchIndex !== -1) {
            matched.push({
              row1Index: i,
              row2Index: bestMatchIndex,
              row1Data: data1[i],
              row2Data: data2[bestMatchIndex],
              matchScore: 100,
            });
            usedFile2Indices.add(bestMatchIndex);
            matched_row = true;
          }
        } else if (duplicateHandling === "all") {
          for (const matchedIndex of matchedIndices) {
            matched.push({
              row1Index: i,
              row2Index: matchedIndex,
              row1Data: data1[i],
              row2Data: data2[matchedIndex],
              matchScore: 100,
            });
            usedFile2Indices.add(matchedIndex);
          }
          matched_row = true;
        }
      }

      if (!matched_row && matchingMode === "fuzzy") {
        let bestFuzzyMatch = -1;
        let bestFuzzySimilarity = 0;

        for (let j = 1; j < data2.length; j++) {
          if (usedFile2Indices.has(j)) continue;

          const keyValue2 = normalizeValue(data2[j][keyColumn]);
          if (!keyValue2) continue;

          const similarity = calculateStringSimilarity(keyValue, keyValue2);

          if (
            similarity >= fuzzyThreshold &&
            similarity > bestFuzzySimilarity
          ) {
            bestFuzzySimilarity = similarity;
            bestFuzzyMatch = j;
          }
        }

        if (bestFuzzyMatch !== -1) {
          matched.push({
            row1Index: i,
            row2Index: bestFuzzyMatch,
            row1Data: data1[i],
            row2Data: data2[bestFuzzyMatch],
            matchScore: bestFuzzySimilarity,
          });
          usedFile2Indices.add(bestFuzzyMatch);
          matched_row = true;
        }
      }

      if (!matched_row) {
        unmatchedF1.push({
          rowIndex: i,
          data: data1[i],
          keyValue: getDisplayValue(data1[i][keyColumn]),
        });
      }
    }

    for (let i = 1; i < data2.length; i++) {
      if (!usedFile2Indices.has(i)) {
        unmatchedF2.push({
          rowIndex: i,
          data: data2[i],
          keyValue: getDisplayValue(data2[i][keyColumn]),
        });
      }
    }

    setUnmatchedFile1Rows(unmatchedF1);
    setUnmatchedFile2Rows(unmatchedF2);

    return matched;
  }, [
    data1,
    data2,
    keyColumn,
    normalizeValue,
    duplicateHandling,
    matchingMode,
    fuzzyThreshold,
    calculateStringSimilarity,
    calculateRowSimilarity,
    getDisplayValue,
    areNumbersEqual,
  ]);

  const findCommonRows = useCallback(() => {
    if (!data1 || !data2) return;

    setLoading(true);
    setProgress(0);
    setShowCommonRows(false);

    try {
      const commonRowsFound: CommonRowData[] = [];

      if (matchingMode === "key" || matchingMode === "fuzzy") {
        const matched = matchRowsByKey();

        if (matched) {
          for (let i = 0; i < matched.length; i++) {
            const pair = matched[i];

            if (areRowsIdentical(pair.row1Data, pair.row2Data)) {
              commonRowsFound.push({
                rowIndex1: pair.row1Index,
                rowIndex2: pair.row2Index,
                data: pair.row1Data,
              });
            }

            const progressPercent = Math.round((i / matched.length) * 100);
            setProgress(progressPercent);
          }
        }
      } else {
        for (let i = 1; i < Math.min(data1.length, data2.length); i++) {
          if (areRowsIdentical(data1[i], data2[i])) {
            commonRowsFound.push({
              rowIndex1: i,
              rowIndex2: i,
              data: data1[i],
            });
          }

          const progressPercent = Math.round((i / data1.length) * 100);
          setProgress(progressPercent);
        }
      }

      setCommonRows(commonRowsFound);
      setShowCommonRows(true);

      toast({
        title: "Common Rows Found",
        description: `Found ${commonRowsFound.length} matching rows between both files`,
      });
    } catch (error) {
      console.error("Common rows error:", error);
      toast({
        title: "Failed to find common rows",
        description: "An error occurred while finding common rows",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [data1, data2, areRowsIdentical, matchingMode, matchRowsByKey, toast]);

  const exportCommonRows = useCallback(() => {
    if (!commonRows || !data1) return;

    try {
      const exportData: SheetRow[] = [];

      if (data1.length > 0) {
        exportData.push(data1[0]);
      }

      commonRows.forEach((commonRow) => {
        exportData.push(commonRow.data);
      });

      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Common Rows");

      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `common_rows_${date}.xlsx`);

      toast({
        title: "Export successful",
        description: `${commonRows.length} common rows exported`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export common rows",
        variant: "destructive",
      });
    }
  }, [commonRows, data1, toast]);

  const exportUnmatchedRows = useCallback(() => {
    if (!data1 || (!unmatchedFile1Rows.length && !unmatchedFile2Rows.length))
      return;

    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([]);

      let currentRow = 0;

      // ========== ADD MAIN TITLE ==========
      XLSX.utils.sheet_add_aoa(
        ws,
        [
          [
            `Unmatched Rows (Total: ${
              unmatchedFile1Rows.length + unmatchedFile2Rows.length
            })`,
          ],
        ],
        { origin: { r: currentRow, c: 0 } }
      );

      // Style main title
      const mainTitleCell = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
      ws[mainTitleCell].s = {
        font: { bold: true, size: 16, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "2F5496" } },
        alignment: { horizontal: "center", vertical: "center" },
      };

      // Merge main title across all columns (A to E)
      if (!ws["!merges"]) ws["!merges"] = [];
      ws["!merges"].push({
        s: { r: currentRow, c: 0 },
        e: { r: currentRow, c: 4 },
      });

      currentRow += 2; // Skip one row

      // ========== ADD SECTION HEADERS ==========
      XLSX.utils.sheet_add_aoa(
        ws,
        [
          [
            `Correct File - Unmatched (${unmatchedFile1Rows.length})`,
            "",
            "",
            `Incorrect File - Unmatched (${unmatchedFile2Rows.length})`,
            "",
          ],
        ],
        { origin: { r: currentRow, c: 0 } }
      );

      // Style Correct File header
      const correctHeaderCell = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
      ws[correctHeaderCell].s = {
        font: { bold: true, size: 12, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "4472C4" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
      ws["!merges"].push({
        s: { r: currentRow, c: 0 },
        e: { r: currentRow, c: 1 },
      });

      // Style Incorrect File header
      const incorrectHeaderCell = XLSX.utils.encode_cell({
        r: currentRow,
        c: 3,
      });
      ws[incorrectHeaderCell].s = {
        font: { bold: true, size: 12, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "C55A11" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
      ws["!merges"].push({
        s: { r: currentRow, c: 3 },
        e: { r: currentRow, c: 4 },
      });

      currentRow++;

      // ========== ADD COLUMN HEADERS ==========
      XLSX.utils.sheet_add_aoa(
        ws,
        [["Row No.", "Correct", "", "Row No.", "Incorrect"]],
        { origin: { r: currentRow, c: 0 } }
      );

      // Style column headers
      ["A", "B", "D", "E"].forEach((col, idx) => {
        const cellRef = `${col}${currentRow + 1}`;
        if (ws[cellRef]) {
          ws[cellRef].s = {
            font: { bold: true },
            fill: {
              patternType: "solid",
              fgColor: { rgb: idx < 2 ? "D9E1F2" : "FCE4D6" },
            },
            alignment: { horizontal: "center", vertical: "center" },
          };
        }
      });

      currentRow++;

      // ========== ADD DATA ROWS ==========
      const maxRows = Math.max(
        unmatchedFile1Rows.length,
        unmatchedFile2Rows.length
      );

      for (let i = 0; i < maxRows; i++) {
        const row: SheetRow = [];

        // Correct File data
        if (i < unmatchedFile1Rows.length) {
          const correctRow = unmatchedFile1Rows[i];
          row.push(
            correctRow.rowIndex,
            correctRow.keyValue ||
              String(correctRow.data[keyColumn] || correctRow.data[0] || "")
          );
        } else {
          row.push("", "");
        }

        // Empty column separator
        row.push("");

        // Incorrect File data
        if (i < unmatchedFile2Rows.length) {
          const incorrectRow = unmatchedFile2Rows[i];
          row.push(
            incorrectRow.rowIndex,
            incorrectRow.keyValue ||
              String(incorrectRow.data[keyColumn] || incorrectRow.data[0] || "")
          );
        } else {
          row.push("", "");
        }

        XLSX.utils.sheet_add_aoa(ws, [row], {
          origin: { r: currentRow, c: 0 },
        });
        currentRow++;
      }

      // ========== SET COLUMN WIDTHS ==========
      ws["!cols"] = [
        { wch: 15 }, // Row No. (Correct)
        { wch: 25 }, // Correct
        { wch: 5 }, // Separator
        { wch: 15 }, // Row No. (Incorrect)
        { wch: 25 }, // Incorrect
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Unmatched Rows");

      // ✅ EXPORT SINGLE FILE WITH MERGED LAYOUT
      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `unmatched_rows_${date}.xlsx`);

      toast({
        title: "Export successful",
        description: `Unmatched rows exported side-by-side (Correct: ${unmatchedFile1Rows.length}, Incorrect: ${unmatchedFile2Rows.length})`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Export failed",
        description: "Could not export unmatched rows",
        variant: "destructive",
      });
    }
  }, [data1, data2, unmatchedFile1Rows, unmatchedFile2Rows, keyColumn, toast]);

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

  // ✅ FIX 2: Update compareDataInChunks to store original values
  const compareDataInChunks = useCallback(
    async (
      pairs: MatchedRowPair[],
      maxCols: number
    ): Promise<{ result: ComparisonCell[][]; stats: Stats }> => {
      return new Promise((resolve, reject) => {
        const comparisonResult: ComparisonCell[][] = [];
        let differences = 0;
        let matches = 0;
        let totalCells = 0;
        let currentRow = 0;

        const processChunk = () => {
          try {
            const endRow = Math.min(currentRow + CHUNK_SIZE, pairs.length);

            for (let i = currentRow; i < endRow; i++) {
              const row: ComparisonCell[] = [];
              const pair = pairs[i];
              const row1 = pair.row1Data;
              const row2 = pair.row2Data;

              let isRowDifferent = false;

              for (let j = 0; j < maxCols; j++) {
                const v1 = getDisplayValue(row1[j]);
                const v2 = getDisplayValue(row2[j]);

                const norm1 = normalizeValue(row1[j]);
                const norm2 = normalizeValue(row2[j]);

                const isEmpty = norm1 === "" && norm2 === "";
                let isDiff = false;

                if (!isEmpty) {
                  const isNum1 =
                    !isNaN(Number(row1[j])) && String(row1[j]).trim() !== "";
                  const isNum2 =
                    !isNaN(Number(row2[j])) && String(row2[j]).trim() !== "";

                  if (isNum1 && isNum2) {
                    isDiff = !areNumbersEqual(row1[j], row2[j]);
                  } else {
                    isDiff = norm1 !== norm2;
                  }

                  if (isDiff) isRowDifferent = true;
                }

                // ✅ CRITICAL FIX: Store ORIGINAL cell values
                row.push({
                  v1,
                  v2,
                  diff: isDiff,
                  isEmpty,
                  original1: row1[j], // ✅ Store original
                  original2: row2[j], // ✅ Store original
                });
              }

              if (isRowDifferent) {
                differences++;
              } else {
                matches++;
              }

              totalCells++;
              comparisonResult.push(row);
            }

            currentRow = endRow;
            const progressPercent = Math.round(
              (currentRow / pairs.length) * 100
            );
            setProgress(progressPercent);

            if (currentRow < pairs.length) {
              setTimeout(processChunk, 0);
            } else {
              const accuracy =
                totalCells > 0 ? (matches / totalCells) * 100 : 100;

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
    [normalizeValue, areNumbersEqual, getDisplayValue]
  );

  const compareData = useCallback(async () => {
    if (!data1 || !data2) return;

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setProgress(0);
    setComparison(null);
    setComparisonStats(null);
    setShowCommonRows(false);

    try {
      let pairs: MatchedRowPair[];

      if (matchingMode === "key" || matchingMode === "fuzzy") {
        const matched = matchRowsByKey();
        if (!matched || matched.length === 0) {
          toast({
            title: "No matches found",
            description:
              matchingMode === "fuzzy"
                ? `No rows found with matching key values (fuzzy threshold: ${fuzzyThreshold}%)`
                : "No rows found with matching key values",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        pairs = matched;
        setMatchedRows(matched);
      } else {
        const minLength = Math.min(data1.length, data2.length);
        pairs = [];
        for (let i = 0; i < minLength; i++) {
          pairs.push({
            row1Index: i,
            row2Index: i,
            row1Data: data1[i],
            row2Data: data2[i],
          });
        }
      }

      const maxCols = Math.max(
        ...pairs.map((p) => Math.max(p.row1Data.length, p.row2Data.length))
      );

      const { result, stats } = await compareDataInChunks(pairs, maxCols);

      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setComparison(result);
      setComparisonStats(stats);

      const unmatchedMsg =
        (matchingMode === "key" || matchingMode === "fuzzy") &&
        (unmatchedFile1Rows.length > 0 || unmatchedFile2Rows.length > 0)
          ? ` | Unmatched: File1(${unmatchedFile1Rows.length}), File2(${unmatchedFile2Rows.length})`
          : "";

      toast({
        title: "Comparison complete",
        description: `Compared ${pairs.length} matched rows - ${stats.differences} differences found${unmatchedMsg}`,
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
  }, [
    data1,
    data2,
    matchingMode,
    fuzzyThreshold,
    matchRowsByKey,
    compareDataInChunks,
    unmatchedFile1Rows,
    unmatchedFile2Rows,
    toast,
  ]);

  // ✅ FIX 3: Update exportComparison to use original values
  const exportComparison = useCallback(async () => {
    if (!comparison || !data1) return;

    const isHeaderRow = (row: SheetRow): boolean => {
      if (!row || row.length === 0) return false;
      const nonEmptyCount = row.filter(
        (cell) => typeof cell === "string" && String(cell).trim().length > 0
      ).length;
      const threshold = Math.ceil(row.length * 0.6);
      return nonEmptyCount >= threshold;
    };

    const normalizeHeader = (val: CellValue): string => {
      return String(val || "")
        .trim()
        .replace(/\s+/g, " ");
    };

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Comparison");

      // ... (keep all color legend code - same as before)
      const titleRow = worksheet.addRow(["COLOR CODING LEGEND"]);
      titleRow.font = { name: "Courier New", bold: true, size: 14 };
      titleRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE7E6E6" },
      };
      worksheet.addRow([""]);

      const redLegendRow = worksheet.addRow([
        "",
        "RED = Wrong/extra characters in incorrect file",
      ]);
      const redCell = redLegendRow.getCell(1);
      redCell.value = "■";
      redCell.font = {
        name: "Courier New",
        color: { argb: "FFFF0000" },
        size: 16,
        bold: true,
      };
      redLegendRow.getCell(2).font = { name: "Courier New", size: 11 };

      const blueLegendRow = worksheet.addRow([
        "",
        "BLUE = Correct characters (missing in incorrect file)",
      ]);
      const blueCell = blueLegendRow.getCell(1);
      blueCell.value = "■";
      blueCell.font = {
        name: "Courier New",
        color: { argb: "FF0000FF" },
        size: 16,
        bold: true,
      };
      blueLegendRow.getCell(2).font = { name: "Courier New", size: 11 };

      const blackLegendRow = worksheet.addRow([
        "",
        "BLACK = Matching characters",
      ]);
      const blackCell = blackLegendRow.getCell(1);
      blackCell.value = "■";
      blackCell.font = {
        name: "Courier New",
        color: { argb: "FF000000" },
        size: 16,
        bold: true,
      };
      blackLegendRow.getCell(2).font = { name: "Courier New", size: 11 };

      worksheet.addRow([""]);
      worksheet.addRow([""]);

      const headerRow = worksheet.addRow([
        "Record",
        "Field",
        "Entered (Incorrect)",
        "Given (Correct)",
      ]);

      headerRow.eachCell((cell: any) => {
        cell.font = {
          name: "Courier New",
          bold: true,
          color: { argb: "FFFFFFFF" },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      worksheet.getColumn(1).width = 18;
      worksheet.getColumn(2).width = 30;
      worksheet.getColumn(3).width = 45;
      worksheet.getColumn(4).width = 45;

      const firstDataRow = data1[0] || [];
      const hasHeaders = isHeaderRow(firstDataRow);
      const headers: string[] = [];

      if (hasHeaders) {
        firstDataRow.forEach((cell, idx) => {
          headers[idx] = normalizeHeader(cell) || `Col ${idx}`;
        });
      }

      let totalDifferences = 0;

      for (let rowIndex = 0; rowIndex < comparison.length; rowIndex++) {
        const row = comparison[rowIndex];

        let recordNo = "";
        for (let i = 0; i < Math.min(3, row.length); i++) {
          const val = row[i]?.v1 || "";
          if (val) {
            recordNo = val;
            break;
          }
        }

        const rowDiffs: Array<{ field: string; v1: string; v2: string }> = [];

        row.forEach((cell, colIndex) => {
          if (cell.diff) {
            const fieldName =
              hasHeaders && headers[colIndex]
                ? headers[colIndex]
                : `Col ${colIndex}`;

            // ✅ CRITICAL FIX: Use original values for LCS comparison
            const v1 = String(cell.original1 || "");
            const v2 = String(cell.original2 || "");

            if (v1 !== v2) {
              rowDiffs.push({ field: fieldName, v1, v2 });
            }
          }
        });

        if (rowDiffs.length > 0) {
          rowDiffs.forEach((diff) => {
            totalDifferences++;

            const { segments1, segments2 } = getDiffSegments(diff.v1, diff.v2);

            const excelRow = worksheet.addRow([recordNo, diff.field, "", ""]);

            const enteredCell = excelRow.getCell(3);
            const enteredRichText = createRichTextFromSegments(
              segments2,
              false
            );
            enteredRichText.forEach((segment) => {
              segment.font = { ...segment.font, name: "Courier New" };
            });
            enteredCell.value = { richText: enteredRichText };
            enteredCell.alignment = { wrapText: true, vertical: "top" };

            const givenCell = excelRow.getCell(4);
            const givenRichText = createRichTextFromSegments(segments1, true);
            givenRichText.forEach((segment) => {
              segment.font = { ...segment.font, name: "Courier New" };
            });
            givenCell.value = { richText: givenRichText };
            givenCell.alignment = { wrapText: true, vertical: "top" };

            excelRow.getCell(1).font = { name: "Courier New" };
            excelRow.getCell(2).font = { name: "Courier New" };
          });

          worksheet.addRow(["", "", "", ""]);
        }
      }

      // ... (keep summary code - same as before)
      if (totalDifferences === 0) {
        const noErrorRow = worksheet.addRow([
          "",
          "✓ No differences - Files match!",
          "",
          "",
        ]);
        noErrorRow.font = { name: "Courier New", size: 12 };
      } else if (comparisonStats) {
        worksheet.addRow(["", "", "", ""]);
        const summaryRow1 = worksheet.addRow([
          "SUMMARY",
          `Total Cells: ${comparisonStats.totalCells}`,
          `Differences: ${comparisonStats.differences}`,
          `Matches: ${comparisonStats.matches}`,
        ]);
        summaryRow1.font = { name: "Courier New", bold: true };

        const summaryRow2 = worksheet.addRow([
          "",
          `Accuracy: ${comparisonStats.accuracy}%`,
          "",
          "",
        ]);
        summaryRow2.font = { name: "Courier New", bold: true };

        if (
          (matchingMode === "key" || matchingMode === "fuzzy") &&
          (unmatchedFile1Rows.length > 0 || unmatchedFile2Rows.length > 0)
        ) {
          const unmatchedRow = worksheet.addRow([
            "",
            `Unmatched in File1: ${unmatchedFile1Rows.length}`,
            "",
            `Unmatched in File2: ${unmatchedFile2Rows.length}`,
          ]);
          unmatchedRow.font = { name: "Courier New" };
        }
      }

      const date = new Date().toISOString().slice(0, 10);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `comparison_${date}.xlsx`;
      link.click();

      toast({
        title: "Export successful",
        description: `Report saved with ${totalDifferences} character-level differences highlighted (Red=Wrong, Blue=Correct)`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Export failed",
        description: "Could not export results",
        variant: "destructive",
      });
    }
  }, [
    comparison,
    data1,
    comparisonStats,
    matchedRows,
    matchingMode,
    unmatchedFile1Rows,
    unmatchedFile2Rows,
    toast,
    getDiffSegments,
    createRichTextFromSegments,
  ]);

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
    setCommonRows(null);
    setShowCommonRows(false);
    setMatchedRows(null);
    setUnmatchedFile1Rows([]);
    setUnmatchedFile2Rows([]);
    setShowUnmatched(false);
  };

  const visibleRows = useMemo(() => {
    if (!comparison) return [];
    if (!showDifferencesOnly) return comparison;
    return comparison.filter((row) => row.some((c) => c.diff));
  }, [comparison, showDifferencesOnly]);

  const availableColumns = useMemo(() => {
    if (!data1 || data1.length === 0) return [];
    const headerRow = data1[0];
    return headerRow.map((cell, idx) => ({
      index: idx,
      label: getDisplayValue(cell) || `Column ${XLSX.utils.encode_col(idx)}`,
    }));
  }, [data1]);

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
    <div className="space-y-6 pb-8  mx-auto px-4">
      <header className="rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 p-6">
        <h1 className="text-2xl font-bold">Excel Comparator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compare spreadsheets with intelligent fuzzy matching for typos &
          errors
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

      {file1 && file2 && !loading && (
        <>
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Matching Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Matching Mode</Label>
                  <Select
                    value={matchingMode}
                    onValueChange={(v: "position" | "key" | "fuzzy") =>
                      setMatchingMode(v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fuzzy">
                        Fuzzy Match (Tolerates Errors)
                      </SelectItem>
                      <SelectItem value="key">Exact Key Match</SelectItem>
                      <SelectItem value="position">Position-Based</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {matchingMode === "fuzzy" &&
                      "Matches similar values (1801869800 ≈ 101869800)"}
                    {matchingMode === "key" &&
                      "Requires exact match in key column"}
                    {matchingMode === "position" &&
                      "Compares rows at same position"}
                  </p>
                </div>

                {(matchingMode === "key" || matchingMode === "fuzzy") && (
                  <>
                    <div className="space-y-2">
                      <Label>Key Column</Label>
                      <Select
                        value={String(keyColumn)}
                        onValueChange={(v) => setKeyColumn(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColumns.map((col) => (
                            <SelectItem
                              key={col.index}
                              value={String(col.index)}
                            >
                              {col.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Column to use for matching rows
                      </p>
                    </div>

                    {matchingMode === "fuzzy" && (
                      <div className="space-y-2">
                        <Label>Fuzzy Match Threshold: {fuzzyThreshold}%</Label>
                        <Input
                          type="range"
                          min="50"
                          max="99"
                          value={fuzzyThreshold}
                          onChange={(e) =>
                            setFuzzyThreshold(parseInt(e.target.value))
                          }
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Lower = More tolerant to differences
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Duplicate Handling</Label>
                      <Select
                        value={duplicateHandling}
                        onValueChange={(v: "first" | "best" | "all") =>
                          setDuplicateHandling(v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="best">Best Match</SelectItem>
                          <SelectItem value="first">First Match</SelectItem>
                          <SelectItem value="all">All Matches</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        How to handle duplicate key values
                      </p>
                    </div>
                  </>
                )}
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Fuzzy Matching Example:</strong>
                  <br />
                  File1: "1801869800" → File2: "101869800" (missing "18")
                  <br />
                  • At 80% threshold: Will match (83% similarity)
                  <br />• At 90% threshold: Won't match (need higher similarity)
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setShowSettings(!showSettings)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              {showSettings ? "Hide" : "Show"} Advanced Settings
            </Button>
          </div>
        </>
      )}

      {showSettings && file1 && file2 && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-5 w-5" />
              Comparison Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="caseSensitive" className="text-sm">
                  Case Sensitive
                </Label>
                <Switch
                  id="caseSensitive"
                  checked={caseSensitive}
                  onCheckedChange={setCaseSensitive}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="ignoreSpaces" className="text-sm">
                  Ignore Spaces
                </Label>
                <Switch
                  id="ignoreSpaces"
                  checked={ignoreSpaces}
                  onCheckedChange={setIgnoreSpaces}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="trimValues" className="text-sm">
                  Trim Values
                </Label>
                <Switch
                  id="trimValues"
                  checked={trimValues}
                  onCheckedChange={setTrimValues}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="precision" className="text-sm">
                Numeric Precision: {numericPrecision} decimal places
              </Label>
              <Input
                id="precision"
                type="range"
                min="0"
                max="10"
                value={numericPrecision}
                onChange={(e) => setNumericPrecision(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Numbers match if difference &lt; 0.
                {Array(numericPrecision).fill("0").join("")}1
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
        <div className="flex justify-center gap-3 flex-wrap">
          <Button onClick={compareData} size="lg">
            Compare Files
          </Button>
          <Button onClick={findCommonRows} size="lg" variant="secondary">
            <GitMerge className="mr-2 h-4 w-4" />
            Find Common Rows
          </Button>
          {(unmatchedFile1Rows.length > 0 || unmatchedFile2Rows.length > 0) && (
            <Button
              onClick={() => setShowUnmatched(!showUnmatched)}
              size="lg"
              variant="outline"
            >
              <XCircle className="mr-2 h-4 w-4" />
              View Unmatched (
              {unmatchedFile1Rows.length + unmatchedFile2Rows.length})
            </Button>
          )}
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
                  <div className="text-xs text-muted-foreground">
                    Matching Rows
                  </div>
                </div>
                <div className="rounded border p-4 text-center bg-red-50 dark:bg-red-950/20">
                  <div className="text-2xl font-bold text-red-600">
                    {comparisonStats.differences}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Mismatched Rows
                  </div>
                </div>
                <div className="rounded border p-4 text-center bg-blue-50 dark:bg-blue-950/20">
                  <div className="text-2xl font-bold text-blue-600">
                    {comparisonStats.totalCells}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Rows
                  </div>
                </div>
                <div className="rounded border p-4 text-center bg-amber-50 dark:bg-amber-950/20">
                  <div className="text-2xl font-bold text-amber-600">
                    {comparisonStats.accuracy}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Row Accuracy
                  </div>
                </div>
              </div>

              {(matchingMode === "key" || matchingMode === "fuzzy") &&
                matchedRows && (
                  <Alert className="mb-4">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Matched {matchedRows.length} rows using "
                      {availableColumns[keyColumn]?.label}" column.
                      {matchingMode === "fuzzy" &&
                        " Fuzzy matching enabled for error tolerance."}
                      {unmatchedFile1Rows.length > 0 &&
                        ` ${unmatchedFile1Rows.length} rows in File1 had no match.`}
                      {unmatchedFile2Rows.length > 0 &&
                        ` ${unmatchedFile2Rows.length} rows in File2 were not used.`}
                    </AlertDescription>
                  </Alert>
                )}

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
                  <div className="flex items-center gap-2">
                    <Switch
                      id="sidebyside"
                      checked={sideBySideView}
                      onCheckedChange={setSideBySideView}
                    />
                    <Label
                      htmlFor="sidebyside"
                      className="text-sm cursor-pointer"
                    >
                      Side-by-Side
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

      {showUnmatched &&
        (unmatchedFile1Rows.length > 0 || unmatchedFile2Rows.length > 0) && (
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Unmatched Rows
                </CardTitle>
                <Button onClick={exportUnmatchedRows} size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export Unmatched
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                {unmatchedFile1Rows.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">
                      Correct File - Unmatched ({unmatchedFile1Rows.length})
                    </h4>
                    <div className="border rounded max-h-60 overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="px-2 py-1 text-left border">Row</th>
                            <th className="px-2 py-1 text-left border">
                              Key Value
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {unmatchedFile1Rows.slice(0, 100).map((row) => (
                            <tr
                              key={row.rowIndex}
                              className="hover:bg-muted/20"
                            >
                              <td className="px-2 py-1 border">
                                {row.rowIndex + 1}
                              </td>
                              <td className="px-2 py-1 border">
                                {row.keyValue}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {unmatchedFile2Rows.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">
                      Incorrect File - Unmatched ({unmatchedFile2Rows.length})
                    </h4>
                    <div className="border rounded max-h-60 overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="px-2 py-1 text-left border">
                              Row No.
                            </th>
                            <th className="px-2 py-1 text-left border">
                              Key Value
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {unmatchedFile2Rows.slice(0, 100).map((row) => (
                            <tr
                              key={row.rowIndex}
                              className="hover:bg-muted/20"
                            >
                              <td className="px-2 py-1 border">
                                {row.rowIndex + 1}
                              </td>
                              <td className="px-2 py-1 border">
                                {row.keyValue}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {showCommonRows && commonRows && (
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <GitMerge className="h-5 w-5" />
                Common Rows Found: {commonRows.length}
              </CardTitle>
              <Button onClick={exportCommonRows} size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export Common Rows
              </Button>
            </div>
          </CardHeader>
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold border">
                    File1 Row
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold border">
                    File2 Row
                  </th>
                  {data1 &&
                    data1[0]?.map((_, i) => (
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
                {commonRows.map((commonRow, idx) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-semibold border bg-green-50 dark:bg-green-950/20">
                      {commonRow.rowIndex1 + 1}
                    </td>
                    <td className="px-3 py-2 font-semibold border bg-blue-50 dark:bg-blue-950/20">
                      {commonRow.rowIndex2 + 1}
                    </td>
                    {commonRow.data.map((cell, colIdx) => (
                      <td key={colIdx} className="px-3 py-2 border">
                        {getDisplayValue(cell) || (
                          <span className="text-muted-foreground italic text-xs">
                            empty
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {comparison &&
        visibleRows.length > 0 &&
        !sideBySideView &&
        !showCommonRows && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">Comparison View</CardTitle>
            </CardHeader>
            <div className="overflow-auto max-h-[600px]">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold border">
                      File1 Row
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold border">
                      File2 Row
                    </th>
                    {matchingMode === "fuzzy" && (
                      <th className="px-3 py-2 text-left text-xs font-semibold border">
                        Match%
                      </th>
                    )}
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

                    const row1Index = matchedRows
                      ? matchedRows[actualIdx]?.row1Index
                      : actualIdx;
                    const row2Index = matchedRows
                      ? matchedRows[actualIdx]?.row2Index
                      : actualIdx;
                    const matchScore = matchedRows
                      ? matchedRows[actualIdx]?.matchScore
                      : undefined;

                    return (
                      <tr key={actualIdx} className="hover:bg-muted/20">
                        <td
                          className={`${
                            dense ? "px-2 py-1 text-xs" : "px-3 py-2"
                          } font-semibold border bg-green-50 dark:bg-green-950/20`}
                        >
                          {row1Index + 1}
                        </td>
                        <td
                          className={`${
                            dense ? "px-2 py-1 text-xs" : "px-3 py-2"
                          } font-semibold border bg-blue-50 dark:bg-blue-950/20`}
                        >
                          {row2Index + 1}
                        </td>
                        {matchingMode === "fuzzy" && (
                          <td
                            className={`${
                              dense ? "px-2 py-1 text-xs" : "px-3 py-2"
                            } font-semibold border ${
                              matchScore && matchScore < 90
                                ? "bg-amber-50 dark:bg-amber-950/20"
                                : ""
                            }`}
                          >
                            {matchScore ? `${matchScore.toFixed(1)}%` : "100%"}
                          </td>
                        )}
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

      {comparison &&
        visibleRows.length > 0 &&
        sideBySideView &&
        !showCommonRows && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">
                Side-by-Side Comparison
              </CardTitle>
            </CardHeader>
            <div className="overflow-auto max-h-[600px]">
              <div className="flex gap-2 p-4">
                <div className="flex-1 border rounded-lg overflow-hidden min-w-0">
                  <div className="bg-green-100 dark:bg-green-950 p-2 font-semibold text-sm sticky top-0 z-10">
                    File 1 (Correct)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead className="sticky top-10 bg-muted/90 backdrop-blur">
                        <tr>
                          <th className="px-2 py-1 text-left text-xs font-semibold border">
                            Row
                          </th>
                          {comparison[0]?.map((_, i) => (
                            <th
                              key={i}
                              className="px-2 py-1 text-left text-xs font-semibold border"
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
                          const row1Index = matchedRows
                            ? matchedRows[actualIdx]?.row1Index
                            : actualIdx;

                          return (
                            <tr key={actualIdx} className="hover:bg-muted/20">
                              <td className="px-2 py-1 text-xs font-semibold border bg-muted/40">
                                {row1Index + 1}
                              </td>
                              {row.map((cell, colIdx) => (
                                <td
                                  key={colIdx}
                                  className={`px-2 py-1 text-xs border ${
                                    cell.diff
                                      ? "bg-green-100 dark:bg-red-950/30 font-semibold"
                                      : ""
                                  }`}
                                >
                                  {cell.v1 || (
                                    <span className="text-muted-foreground italic">
                                      -
                                    </span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex-1 border rounded-lg overflow-hidden min-w-0">
                  <div className="bg-red-100 dark:bg-red-950 p-2 font-semibold text-sm sticky top-0 z-10">
                    File 2 (Incorrect)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead className="sticky top-10 bg-muted/90 backdrop-blur">
                        <tr>
                          <th className="px-2 py-1 text-left text-xs font-semibold border">
                            Row
                          </th>
                          {comparison[0]?.map((_, i) => (
                            <th
                              key={i}
                              className="px-2 py-1 text-left text-xs font-semibold border"
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
                          const row2Index = matchedRows
                            ? matchedRows[actualIdx]?.row2Index
                            : actualIdx;

                          return (
                            <tr key={actualIdx} className="hover:bg-muted/20">
                              <td className="px-2 py-1 text-xs font-semibold border bg-muted/40">
                                {row2Index + 1}
                              </td>
                              {row.map((cell, colIdx) => (
                                <td
                                  key={colIdx}
                                  className={`px-2 py-1 text-xs border ${
                                    cell.diff
                                      ? "bg-red-100 dark:bg-red-950/30 font-semibold"
                                      : ""
                                  }`}
                                >
                                  {cell.v2 || (
                                    <span className="text-muted-foreground italic">
                                      -
                                    </span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
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
                  <li>Choose matching mode (Fuzzy recommended for errors)</li>
                  <li>
                    Select key column and adjust fuzzy threshold if needed
                  </li>
                  <li>Configure comparison settings (optional)</li>
                  <li>Click "Compare Files" or "Find Common Rows"</li>
                  <li>Review results, unmatched rows, and export reports</li>
                </ol>
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    ✓ <strong>Fuzzy Match:</strong> Tolerates typos, missing
                    digits (1801869800 ≈ 101869800)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ✓ <strong>View Unmatched:</strong> See rows that couldn't be
                    matched
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ✓ <strong>Export Reports:</strong> Save comparison, common
                    rows, and unmatched data
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExcelComparator;

// function lengthOfLongestSubstring(s: string): number {
//   let maxLength = 0;
//   let start = 0;
//   let charMap = new Map();

//   for (let i = 0; i < s.length; i++) {
//     if (charMap.has(s[i])) {
//       start = Math.max(start, charMap.get(s[i]) + 1);
//     }
//     charMap.set(s[i], i);
//     maxLength = Math.max(maxLength, i - start + 1);
//   }

//   return maxLength;
// }
