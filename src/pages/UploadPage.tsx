import { BookOpen, Database, FileSpreadsheet, Layers3, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProgressBar, progressLabel } from "../components/common/ProgressBar";
import { useReport } from "../context/ReportContext";
import { formatNumber } from "../utils/format";

export const APP_VERSION = "1.10.3";
const DB_NAME = "rta-report-analyzer-cache";
const STORE_NAME = "excel-files";
const MAX_FILES = 20;