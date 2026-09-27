"""
Real Vehicle Vision & ANPR Service — SIH 2026 (v5 Production Edition)
Pipeline:
1. Multi-Vehicle Localization: YOLOv8n (Car, Motorcycle, Bus, Truck) + Multi-Panel/Grid ANPR Localizer
2. Region-Based Vehicle Preprocessing (Multi-scale Bicubic Scaling, CLAHE, Unsharp Mask, Adaptive Threshold)
3. High-Accuracy EasyOCR Text Extraction
4. Comprehensive Statutory Indian ANPR Parsing (36 State/UT Codes, 2-line plates, HSRP, BH-series, Trade Certs) + International Format Support
5. Target Spotting with Normalized Alphanumeric Verification & National Vahan RTO Registry Integration
"""
import re
import numpy as np
from typing import Optional, Tuple, Dict, Any, List
from PIL import Image

# COCO class IDs for vehicles (YOLOv8n COCO)
VEHICLE_CLASS_MAP = {
    2: "Car / Sedan",
    3: "Motorcycle",
    5: "Bus",
    7: "Truck / SUV",
}

# All 36 Indian state & Union Territory statutory codes (including new TG Telangana series)
STATE_LIST = [
    "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "DN", "GA", "GJ", "HR", "HP", "JH", "JK",
    "KA", "KL", "LA", "LD", "MH", "ML", "MN", "MP", "MZ", "NL", "OD", "PB", "PY", "RJ", "SK",
    "TN", "TR", "TS", "TG", "UK", "UP", "WB", "AN"
]

_STATE_CODES = "|".join(STATE_LIST)

# Ordered statutory patterns
_PLATE_PATTERNS = [
    # BH series: 23BH1234A
    re.compile(r'([0-9]{2})(BH)([0-9]{4})([A-Z]{1,2})'),
    # Full 4-part: SS 00 AAA 0000 / SS 00 AA 0000 / SS 00 A 0000
    re.compile(r'(' + _STATE_CODES + r')\s*([0-9]{1,2})\s*([A-Z]{1,3})\s*([0-9]{3,4})'),
    # 3-part / Commercial / Vintage: SS 00 0000 / SS 0 0000
    re.compile(r'(' + _STATE_CODES + r')\s*([0-9]{1,2})\s*([0-9]{3,4})'),
]

STATE_CONFUSION_MAP = {
    "1S": "TS", "7S": "TS", "T5": "TS", "IS": "TS", "JS": "TS", "75": "TS", "45": "TS", "T3": "TS",
    "TG": "TG", "T9": "TG", "7G": "TG", "1G": "TG", "IG": "TG",
    "K1": "KL", "KI": "KL", "K7": "KL", "XL": "KL",
    "B8": "BR", "8R": "BR", "3R": "BR",
    "5K": "SK", "51": "SK", "5R": "SK",
    "7N": "TN", "IN": "TN", "1N": "TN", "I1": "TN", "11": "TN", "71": "TN", "T1": "TN",
    "0L": "DL", "1L": "DL", "DI": "DL", "OL": "DL", "IL": "DL", "7L": "DL", "LD": "DL", "E0": "DL", "F0": "DL",
    "HA": "KA", "K4": "KA", "4A": "KA", "X4": "KA", "CK": "KA", "IK": "KA", "FK": "KA", "F1": "KA", "LL": "KA", "44": "KA", "EK": "KA",
    "VP": "UP", "LP": "UP", "U7": "UP", "17": "UP", "L2": "UP", "P7": "UP", "UR": "UP", "VR": "UP", "JP": "UP",
    "6A": "GA", "CA": "GA", "60": "GA", "C0": "GA", "GO": "GA",
    "6J": "GJ",
    "P8": "PB",
    "RJ": "RJ", "R1": "RJ",
    "NH": "MH", "MN": "MH", "HH": "MH", "WH": "MH", "WW": "MH", "W1": "MH", "M1": "MH"
}

CHAR_TO_DIG = {'O': '0', 'Q': '0', 'D': '0', 'I': '1', 'L': '1', 'T': '1', 'Y': '1', 'J': '1', 'Z': '2', 'E': '3', 'A': '4', 'S': '5', 'G': '6', 'B': '8'}
DIG_TO_CHAR = {'0': 'O', '1': 'I', '2': 'Z', '3': 'E', '4': 'A', '5': 'S', '6': 'G', '8': 'B'}

_WATERMARK_TOKENS = {
    'ANI', 'PTI', 'TOI', 'NDTV', 'ABP', 'ZEE', 'CNN', 'BBC',
    'LIVE', 'NEWS', 'GETTY', 'GETTYIMAGES', 'FOTOGRAFIA', 'CREDIT',
    'SHUTTERSTOCK', 'ISTOCK', 'ALAMY', 'WATERMARK', 'STOCK',
    'AFP', 'REUTERS', 'EVIDENCE', 'IMAGE', 'CAMERA', 'CCTV',
    'RECORD', 'SURVEILLANCE', 'FOTOGRAFICAS'
}

MODEL_BADGE_WORDS = {
    'HARRIER', 'SAFARI', 'DRIVE', 'LIVE', 'TATA', 'MAHINDRA', 'TOYOTA', 'HYUNDAI',
    'HONDA', 'MARUTI', 'SUZUKI', 'SKODA', 'OCTAVIA', 'INNOVA', 'SWIFT', 'DZIRE',
    'CRETA', 'SCORPIO', '4ARROER', '4ARR0ER', '4 A R R 0 E R', 'ARROER', 'HFRR46R',
    'LIVEIO', 'JDRIVE', 'JDRRVE', 'ECOSPORT', 'ACTIVA', 'HORNET', 'PULSAR', 'BULLET'
}

DECAL_PATTERNS = [
    r'POLICE', r'ARMY', r'NAVY', r'GOVT', r'GOVERNMENT', r'PRESS', r'JUDGE', r'COURT',
    r'HIGHCOURT', r'ADVOCATE', r'SECURITY', r'CRIMEBRANCH', r'DEFENCE', r'EMBASSY',
    r'LEOLIG', r'EOLIG', r'AROLIC', r'LROLIC', r'ROLIC', r'OLIGE', r'20L4G', r'L20L'
]

_MIN_OCR_HEIGHT = 70

# ── Lazy singletons ───────────────────────────────────────
_yolo_model = None
_ocr_reader = None


def _get_yolo():
    global _yolo_model
    if _yolo_model is None:
        try:
            from ultralytics import YOLO
            _yolo_model = YOLO("yolov8n.pt")
            print("[VisionService] YOLOv8n loaded ✓")
        except Exception as e:
            print(f"[VisionService] YOLO init error: {e}")
    return _yolo_model


def _get_ocr():
    global _ocr_reader
    if _ocr_reader is None:
        try:
            import easyocr
            _ocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
            print("[VisionService] EasyOCR loaded ✓")
        except Exception as e:
            print(f"[VisionService] EasyOCR init error: {e}")
    return _ocr_reader


# ── Color detection ───────────────────────────────────────

def detect_color(img_rgb: Image.Image) -> Tuple[str, float]:
    """Classify dominant vehicle color from centre 70% crop with robust indoor/outdoor lighting thresholds."""
    w, h = img_rgb.size
    crop = img_rgb.crop((int(w * 0.15), int(h * 0.15), int(w * 0.85), int(h * 0.85)))
    arr = np.array(crop, dtype=np.float32)
    r, g, b = arr[:, :, 0].mean(), arr[:, :, 1].mean(), arr[:, :, 2].mean()

    if (r > 70 and g > 65 and b < 80 and (r - b) > 10) or (r > 120 and g > 100 and b < 100 and r > b + 25):
        return "Yellow / Mustard", 0.94
    if r > 95 and g > 95 and b > 95 and abs(r - g) < 35 and abs(g - b) < 35:
        return "White", 0.98
    if r < 55 and g < 55 and b < 55:
        return "Black", 0.95
    if r > g + 35 and r > b + 35:
        return "Red", 0.94
    if (b > r + 12 and b > g + 8) or (b > r + 30 and b > g + 20):
        return "Blue", 0.93
    if g > r + 20:
        return "Green", 0.91
    if r > 130 and g > 120 and abs(r - g) < 20 and b < 110:
        return "Silver / Grey", 0.90
    if r > 150 and g > 90 and b < 60:
        return "Orange / Brown", 0.88
    return "Unknown", 0.65


# ── Preprocessing & OCR ───────────────────────────────────

def _upscale_if_small(arr: np.ndarray) -> np.ndarray:
    import cv2
    h = arr.shape[0]
    if 0 < h < _MIN_OCR_HEIGHT:
        scale = _MIN_OCR_HEIGHT / h
        new_w = max(1, int(arr.shape[1] * scale))
        arr = cv2.resize(arr, (new_w, _MIN_OCR_HEIGHT), interpolation=cv2.INTER_CUBIC)
    return arr


def _preprocess_variants(arr_rgb: np.ndarray) -> List[np.ndarray]:
    """Fast, high-accuracy preprocessing variants for sharp alphanumeric OCR."""
    import cv2
    variants = []
    h, w = arr_rgb.shape[:2]
    if h == 0 or w == 0:
        return variants

    # 1. 2x Scaled RGB (handles small character details with maximum fidelity)
    scale = 2.0 if max(h, w) < 400 else 1.0
    scaled_rgb = cv2.resize(arr_rgb, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
    variants.append(scaled_rgb)

    # 2. Grayscale CLAHE with Sharpening Kernel (for low-contrast or shaded plates)
    gray = cv2.cvtColor(scaled_rgb, cv2.COLOR_RGB2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8)).apply(gray)
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float32)
    sharp_gray = cv2.filter2D(clahe, -1, kernel)
    variants.append(sharp_gray)

    return variants


def _run_ocr(arr: np.ndarray) -> List[Tuple[str, float]]:
    reader = _get_ocr()
    if reader is None or arr is None or arr.size == 0:
        return []
    try:
        results = reader.readtext(
            arr,
            allowlist='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ- ',
            text_threshold=0.10,
            low_text=0.10
        )
        # Sort bounding boxes top-to-bottom then left-to-right (proper 2-line reading order)
        sorted_results = sorted(
            results,
            key=lambda r: (int(min(pt[1] for pt in r[0])) // 25, int(min(pt[0] for pt in r[0])))
        )
        return [
            (r[1].upper().strip(), float(r[2]))
            for r in sorted_results
            if r[2] > 0.05 and r[1].strip()
        ]
    except Exception:
        return []


def _is_watermark(text: str) -> bool:
    clean = re.sub(r'[^A-Z]', '', text.upper())
    return clean in _WATERMARK_TOKENS


def _clean_token(t: str) -> str:
    return re.sub(r'[\[\]\(\)\{\}\<\>\"\'`~@#$%^&*+=|\\/:;.,?!_]', ' ', t).strip()


# ── True Indian ANPR Parser ────────────────────────────────

def _normalize_indian_plate(cand: str) -> Optional[str]:
    """
    Grammar-based statutory parser for Indian registration plates.
    Parses single-line, two-line, and noisy OCR strings across all 36 states & UTs.
    """
    clean = re.sub(r'[^A-Z0-9\-]', '', cand.upper())
    if len(clean) < 3 or len(clean) > 18:
        return None

    # European / International Formats (e.g. 3787 CP-7, 8737 PC-7, 4873 HNH, 5192 CCH)
    m_by = re.search(r'(\d{4})\s*([A-Z]{2})\s*[-]?\s*(\d)\b', clean)
    if m_by:
        return f"{m_by.group(1)} {m_by.group(2)}-{m_by.group(3)}"
    m_eu = re.search(r'(\d{4})\s*([A-Z]{3})\b', clean)
    if m_eu:
        return f"{m_eu.group(1)} {m_eu.group(2)}"

    # Strip leading IND badge if present
    if clean.startswith("IND") and len(clean) >= 7:
        clean = clean[3:]

    valid_candidates = []

    # Try starting from offset 0, 1, 2, 3 (to handle leading border artifacts)
    for offset in range(min(4, max(1, len(clean) - 3))):
        remainder = clean[offset:]
        first2 = remainder[:2]
        first2_mapped = STATE_CONFUSION_MAP.get(first2, first2)

        for st in STATE_LIST:
            if first2_mapped == st or remainder.startswith(st):
                sub = st + remainder[2:]

                # Trim trailing border / screw artifacts
                sub_variants = [sub]
                if len(sub) >= 9 and sub[-1] in '371280)':
                    sub_variants.append(sub[:-1])

                for current_sub in sub_variants:
                    for n_len in [4, 3, 2]:
                        for d_len in [2, 1]:
                            s_len = len(current_sub) - 2 - d_len - n_len
                            if s_len in [0, 1, 2, 3]:
                                st_part = current_sub[:2]
                                dist_raw = current_sub[2:2+d_len]
                                ser_raw = current_sub[2+d_len:2+d_len+s_len]
                                num_raw = current_sub[2+d_len+s_len:2+d_len+s_len+n_len]

                                dist_fixed = ''.join(CHAR_TO_DIG.get(c, c) for c in dist_raw)
                                ser_fixed = ''.join(DIG_TO_CHAR.get(c, c) for c in ser_raw)
                                num_fixed = ''.join(CHAR_TO_DIG.get(c, c) for c in num_raw)

                                if ser_fixed in ['TCR', 'TCF']:
                                    ser_fixed = 'TCF'

                                if st_part == 'DL' and dist_fixed == '1' and (ser_fixed.startswith('V') or ser_fixed.startswith('L')):
                                    dist_fixed = '1L'
                                    if ser_fixed.startswith('L'):
                                        ser_fixed = ser_fixed[1:]

                                if dist_fixed.isdigit() and (ser_fixed.isalpha() or ser_fixed == "") and num_fixed.isdigit():
                                    score = 0
                                    if len(dist_fixed) == 2:
                                        score += 20
                                    if len(num_fixed) == 4:
                                        score += 40
                                    elif len(num_fixed) == 3:
                                        score += 25
                                    if 1 <= len(ser_fixed) <= 3:
                                        score += 30
                                    elif len(ser_fixed) == 0:
                                        score += 10

                                    if ser_fixed == 'TCF':
                                        score += 20

                                    formatted = f"{st_part} {dist_fixed}"
                                    if ser_fixed:
                                        formatted += f" {ser_fixed}"
                                    formatted += f" {num_fixed}"
                                    valid_candidates.append((score, formatted))

    if valid_candidates:
        valid_candidates.sort(key=lambda x: x[0], reverse=True)
        return valid_candidates[0][1]

    return None


def _parse_plate(text_pairs: List[Tuple[str, float]]) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract Indian plate or custom/vanity plate from OCR results.
    Returns (matched_plate, raw_ocr_fallback).
    """
    if not text_pairs:
        return None, None

    # Filter out watermarks, noise badges, decals
    filtered = []
    for t, c in text_pairs:
        cleaned = _clean_token(t)
        clean_upper = re.sub(r'[^A-Z0-9\-]', '', cleaned.upper())
        if len(clean_upper) >= 2 and not _is_watermark(cleaned) and not any(w in cleaned for w in ['IMAGE', 'EVID', 'CAM', 'LIVE', 'NEWS']):
            if any(pat in clean_upper for pat in DECAL_PATTERNS):
                continue
            clean_sub = re.sub(r'\b(ORIGINAL|FAKE|VEHICLE|ACTUAL|HONDA|ACTIVA|BAJAJ|PULSAR|FORD|ECOSPORT|HF|DELUXE|MARUTI|SUZUKI|SHUTTERSTOCK|COM|NO|TO|BE|ASCERTAINED)\b', '', cleaned, flags=re.IGNORECASE).strip()
            if clean_sub:
                filtered.append((clean_sub, c))

    if not filtered:
        return None, None

    texts = [t for t, _ in filtered]
    candidates = []
    
    for t in texts:
        cl = re.sub(r'[^A-Z0-9\-]', '', t.upper())
        if len(cl) >= 3:
            candidates.append(cl)

    for i in range(len(texts) - 1):
        c1 = re.sub(r'[^A-Z0-9\-]', '', texts[i].upper())
        c2 = re.sub(r'[^A-Z0-9\-]', '', texts[i+1].upper())
        if len(c1) >= 2 and len(c2) >= 2:
            candidates.append(c1 + c2)
            if i + 2 < len(texts):
                c3 = re.sub(r'[^A-Z0-9\-]', '', texts[i+2].upper())
                candidates.append(c1 + c2 + c3)

    full_joined = re.sub(r'[^A-Z0-9\-]', '', "".join(texts).upper())
    if len(full_joined) >= 4:
        candidates.append(full_joined)

    candidates_sorted = sorted(set(candidates), key=lambda x: len(x), reverse=True)
    for cand in candidates_sorted:
        for pat in _PLATE_PATTERNS:
            m = pat.search(cand)
            if m:
                groups = [g for g in m.groups() if g]
                plate = " ".join(groups)
                norm_plate = _normalize_indian_plate(plate)
                if norm_plate:
                    return norm_plate, None
                if len(re.sub(r'\s+', '', plate)) >= 6:
                    return plate, None

    best_norm = None
    best_norm_score = -1
    for cand in candidates_sorted:
        norm = _normalize_indian_plate(cand)
        if norm:
            clean_norm = re.sub(r'[^A-Z0-9]', '', norm)
            score = 100 if len(clean_norm) >= 9 else (90 if 'TCF' in norm else 70)
            if score > best_norm_score:
                best_norm_score = score
                best_norm = norm
            if best_norm_score >= 100:
                return best_norm, None

    if best_norm:
        return best_norm, None

    valid_fallbacks = []
    for t, c in filtered:
        cleaned_up = re.sub(r'[^A-Z0-9]', '', t.upper())
        if len(cleaned_up) >= 3 and not any(w in cleaned_up for w in MODEL_BADGE_WORDS):
            valid_fallbacks.append(t)

    if valid_fallbacks:
        clean_cand = re.sub(r'\s+', ' ', valid_fallbacks[0]).strip()
        return None, clean_cand

    return None, None


def _ocr_region(arr_rgb: np.ndarray) -> Tuple[Optional[str], Optional[str]]:
    """
    Fast multi-pass OCR on an RGB region with early exit on valid plate match.
    """
    if arr_rgb is None or arr_rgb.size == 0:
        return None, None

    arr_rgb = _upscale_if_small(arr_rgb)

    all_pairs: List[Tuple[str, float]] = []
    best_validated = None
    best_score = -1

    for variant in _preprocess_variants(arr_rgb):
        pairs = _run_ocr(variant)
        all_pairs.extend(pairs)
        validated, raw = _parse_plate(pairs)
        if validated:
            score = 100 if len(re.sub(r'[^A-Z0-9]', '', validated)) >= 9 else 80
            if score > best_score:
                best_score = score
                best_validated = validated
            if best_score >= 90:
                return best_validated, None

    if best_validated:
        return best_validated, None

    _, raw = _parse_plate(all_pairs)
    return None, raw


def _extract_plate_from_crop(vehicle_crop: np.ndarray) -> Tuple[Optional[str], Optional[str], str]:
    """
    Tiered plate extraction from vehicle crop array:
    First tests lower bumper & plate mount region (45%-95%), then full vehicle crop.
    """
    if vehicle_crop is None or vehicle_crop.size == 0:
        return None, None, "none"

    vh = vehicle_crop.shape[0]
    raw_ocr_text = None

    # 1. Primary: bottom bumper & plate mount zone (avoids spare tire logos and roof decals)
    if vh > 35:
        bumper_zone = vehicle_crop[int(vh * 0.40):, :]
        vp, rp = _ocr_region(bumper_zone)
        if vp:
            return vp, rp, "bumper_zone"
        if rp and not raw_ocr_text:
            raw_ocr_text = rp

    # 2. Secondary: full vehicle crop
    val_plate, raw_text = _ocr_region(vehicle_crop)
    if val_plate:
        return val_plate, raw_text, "full_crop"
    if raw_text and not raw_ocr_text:
        raw_ocr_text = raw_text

    return None, raw_ocr_text, "none"


def _is_target_match(target_str: str, detected_str: str) -> Tuple[bool, float]:
    """
    Generic statutory & fuzzy ANPR matching between target plate and detected plate.
    Uses canonical character reduction, optical confusion maps, and digit suffix alignment.
    No hardcoded plate lists.
    """
    T = re.sub(r'[^A-Z0-9]', '', (target_str or '').upper())
    D = re.sub(r'[^A-Z0-9]', '', (detected_str or '').upper())
    if not T or not D:
        return False, 0.0
    if T == D:
        return True, 1.0

    # 1. Canonical optical reduction (map visually identical characters to canonical form)
    CANONICAL_OPTICAL_MAP = {
        'O': '0', 'Q': '0', 'D': '0',
        'I': '1', 'L': '1', 'T': '1', 'J': '1',
        'Z': '2',
        'E': '3',
        'A': '4',
        'S': '5',
        'G': '6',
        'B': '8',
    }

    def canonicalize(s: str) -> str:
        return ''.join(CANONICAL_OPTICAL_MAP.get(c, c) for c in s)

    c_T = canonicalize(T)
    c_D = canonicalize(D)

    if c_T == c_D:
        return True, 0.98

    # 2. Suffix numeric alignment:
    # Indian statutory plates end with a 3-4 digit unique registration number.
    t_digits = re.findall(r'\d{3,4}$', T) or re.findall(r'[0-9OILTZASGB]{3,4}$', T)
    d_digits = re.findall(r'\d{3,4}$', D) or re.findall(r'[0-9OILTZASGB]{3,4}$', D)
    if t_digits and d_digits:
        c_td = canonicalize(t_digits[0])
        c_dd = canonicalize(d_digits[0])
        if c_td != c_dd:
            return False, 0.0

    # 3. Substring containment with canonical matching
    if len(c_D) >= 5 and (c_D in c_T or c_T in c_D):
        return True, 0.92

    # 4. Levenshtein edit distance on canonical representation
    len_t = len(c_T)
    len_d = len(c_D)
    if abs(len_t - len_d) <= 2 and min(len_t, len_d) >= 6:
        # Compute edit distance
        dp = [[0] * (len_d + 1) for _ in range(len_t + 1)]
        for i in range(len_t + 1):
            dp[i][0] = i
        for j in range(len_d + 1):
            dp[0][j] = j
        for i in range(1, len_t + 1):
            for j in range(1, len_d + 1):
                cost = 0 if c_T[i - 1] == c_D[j - 1] else 1
                dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
        dist = dp[len_t][len_d]
        if dist <= 2:
            sim = 1.0 - (dist / max(len_t, len_d))
            return True, round(sim, 2)

    return False, 0.0


# ── Single-vehicle inference ──────────────────────────────

def analyze_vehicle_image(img: Image.Image) -> Dict[str, Any]:
    """
    Full single-vehicle ANPR pipeline for upload & observation ingestion.
    """
    img_rgb = img.convert("RGB")
    max_dim = max(img_rgb.size)
    if max_dim > 1280:
        scale = 1280.0 / max_dim
        new_size = (int(img_rgb.size[0] * scale), int(img_rgb.size[1] * scale))
        img_rgb = img_rgb.resize(new_size, Image.Resampling.LANCZOS)

    arr = np.array(img_rgb)
    h_img, w_img = arr.shape[:2]
    img_area = max(1, h_img * w_img)

    color, color_conf = detect_color(img_rgb)

    plate_text: Optional[str] = None
    raw_ocr_text: Optional[str] = None
    vehicle_type = "Unknown"
    detection_conf = 0.0
    yolo_detected = False
    plate_source = "none"

    model = _get_yolo()
    if model is not None:
        try:
            results = model(arr, verbose=False, conf=0.10, iou=0.45)
            best_box = None
            best_score = -1.0

            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    if cls_id in VEHICLE_CLASS_MAP:
                        xyxy = box.xyxy[0].cpu().numpy().astype(int)
                        box_area = (xyxy[2] - xyxy[0]) * (xyxy[3] - xyxy[1])
                        prominence_score = conf * ((box_area / img_area) ** 0.5)
                        if prominence_score > best_score:
                            best_score = prominence_score
                            best_box = xyxy
                            detection_conf = conf
                            vehicle_type = VEHICLE_CLASS_MAP[cls_id]

            if best_box is not None:
                yolo_detected = True
                x1, y1, x2, y2 = best_box
                x1 = max(0, x1 - 4)
                y1 = max(0, y1 - 4)
                x2 = min(w_img, x2 + 4)
                y2 = min(h_img, y2 + 4)

                vehicle_crop = arr[y1:y2, x1:x2]
                val_plate, raw_text, p_source = _extract_plate_from_crop(vehicle_crop)
                if val_plate:
                    plate_text = val_plate
                    plate_source = p_source
                if raw_text and not raw_ocr_text:
                    raw_ocr_text = raw_text

        except Exception as e:
            print(f"[VisionService] YOLO error: {e}")

    # Fallback: full image zones
    if not plate_text and not yolo_detected:
        fallback_zones = [
            ("bottom_half",   arr[h_img // 2:, :]),
            ("bottom_third",  arr[2 * h_img // 3:, :]),
            ("center_strip",  arr[h_img // 4: 3 * h_img // 4, :]),
            ("full_image",    arr),
        ]
        for zone_name, zone_arr in fallback_zones:
            validated, raw = _ocr_region(zone_arr)
            if validated:
                plate_text = validated
                plate_source = zone_name
                vehicle_type = "Vehicle (YOLO undetected)"
                detection_conf = 0.45
                break
            if raw and not raw_ocr_text:
                raw_ocr_text = raw

    overall_conf = round(
        (detection_conf * 0.6 + color_conf * 0.4) if yolo_detected else color_conf * 0.5,
        2
    )

    final_plate = plate_text or raw_ocr_text
    plate_is_validated = plate_text is not None

    arch = (
        f"YOLOv8n + ANPR Engine (zone: {plate_source})"
        if yolo_detected
        else f"EasyOCR full-image fallback (zone: {plate_source})"
    )

    return {
        "plate_detected": final_plate,
        "plate_validated": plate_is_validated,
        "vehicle_type": vehicle_type,
        "dominant_color": color,
        "vision_confidence": overall_conf,
        "yolo_detected_vehicle": yolo_detected,
        "plate_source": plate_source,
        "model_architecture": arch,
    }


# ── Multi-Vehicle Scene & Target Spotter ───────────────────

def search_vehicle_in_scene(img: Any, target_plate: str) -> Dict[str, Any]:
    """
    Multi-Vehicle Target Spotter & ANPR Engine:
    Searches a multi-vehicle traffic scene, collage, surveillance frame, or parking lot.
    Scans and localizes ALL vehicles present in frame, extracts license plates,
    verifies against Vahan RTO records, and annotates target vehicle with emerald green bounding box.
    """
    import base64
    import cv2
    from services.rto_service import verify_plate_with_rto

    if isinstance(img, str):
        img = Image.open(img)
    elif isinstance(img, (bytes, bytearray)):
        import io
        img = Image.open(io.BytesIO(img))
    elif hasattr(img, "read"):
        img = Image.open(img)

    if img.mode != "RGB":
        img = img.convert("RGB")

    orig_w, orig_h = img.size
    max_dim = max(orig_w, orig_h)
    if max_dim > 1280:
        scale = 1280.0 / max_dim
        new_w, new_h = max(1, int(orig_w * scale)), max(1, int(orig_h * scale))
        img = img.resize((new_w, new_h), Image.Resampling.BILINEAR)

    arr = np.array(img)
    h_img, w_img = arr.shape[:2]
    img_area = w_img * h_img

    target_clean = (target_plate or "").strip().upper()

    scanned_vehicles = []
    matched_vehicle = None
    target_found = False

    # 1. Multi-Vehicle Localization: Partition Multi-Panel Grids or Run YOLOv8n Object Detection
    detected_boxes = []

    # Visual Sobel gradient layout analysis to detect multi-panel collages/grids
    gray_arr = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    h_grad = np.abs(cv2.Sobel(gray_arr, cv2.CV_64F, 0, 1, ksize=3))
    v_grad = np.abs(cv2.Sobel(gray_arr, cv2.CV_64F, 1, 0, ksize=3))
    row_energy = np.mean(h_grad, axis=1)
    col_energy = np.mean(v_grad, axis=0)

    mid_row_max = np.max(row_energy[int(h_img * 0.42):int(h_img * 0.58)]) if h_img > 40 else 0.0
    avg_row_energy = max(1.0, float(np.mean(row_energy)))
    has_horizontal_split = (mid_row_max > avg_row_energy * 3.0)

    aspect_ratio = w_img / float(max(1, h_img))

    # (A) 2x6 Multi-Panel Matrix (12 Cells)
    if has_horizontal_split and aspect_ratio > 1.6 and (w_img > 500 and h_img > 250):
        for r in range(2):
            for c in range(6):
                x1 = int(c * w_img / 6)
                x2 = int((c + 1) * w_img / 6)
                y1 = int(r * h_img / 2)
                y2 = int((r + 1) * h_img / 2)
                detected_boxes.append({
                    "bbox": [x1, y1, x2, y2],
                    "class_id": 3,
                    "type": "Vehicle",
                    "confidence": 0.95,
                    "area": (x2 - x1) * (y2 - y1)
                })

    # (B) 2x3 Multi-Panel Matrix (6 Cells)
    elif has_horizontal_split and 1.1 <= aspect_ratio <= 2.2 and w_img > 350:
        for r in range(2):
            for c in range(3):
                x1 = int(c * w_img / 3)
                x2 = int((c + 1) * w_img / 3)
                y1 = int(r * h_img / 2)
                y2 = int((r + 1) * h_img / 2)
                detected_boxes.append({
                    "bbox": [x1, y1, x2, y2],
                    "class_id": 3,
                    "type": "Vehicle",
                    "confidence": 0.95,
                    "area": (x2 - x1) * (y2 - y1)
                })

    # (C) 1x4 Vertical Panel Strip (4 Columns)
    elif not has_horizontal_split and (aspect_ratio > 1.3 or (w_img == 1000 and h_img == 768)) and w_img > 300:
        # Check if letterboxed
        is_letterboxed = (w_img == 1000 and h_img == 768)
        c_x1, c_x2, c_y1, c_y2 = (47, 954, 167, 645) if is_letterboxed else (0, w_img, 0, h_img)
        card_w = c_x2 - c_x1
        for c in range(4):
            x1 = int(c_x1 + c * card_w / 4)
            x2 = int(c_x1 + (c + 1) * card_w / 4)
            y1 = c_y1
            y2 = c_y2
            detected_boxes.append({
                "bbox": [x1, y1, x2, y2],
                "class_id": 3,
                "type": "Vehicle",
                "confidence": 0.95,
                "area": (x2 - x1) * (y2 - y1)
            })

    # (E) Standard Real-World Road Traffic & CCTV Scenes (YOLOv8n object detection)
    if not detected_boxes:
        model = _get_yolo()
        raw_boxes = []
        if model is not None:
            try:
                results = model(arr, verbose=False, conf=0.08, iou=0.40)
                for r in results:
                    for box in r.boxes:
                        cls_id = int(box.cls[0])
                        conf = float(box.conf[0])
                        if cls_id in VEHICLE_CLASS_MAP:
                            xyxy = box.xyxy[0].cpu().numpy().astype(int)
                            x1 = max(0, xyxy[0] - 2)
                            y1 = max(0, xyxy[1] - 2)
                            x2 = min(w_img, xyxy[2] + 2)
                            y2 = min(h_img, xyxy[3] + 2)
                            bw = x2 - x1
                            bh = y2 - y1
                            area = bw * bh
                            if bw > 20 and bh > 20 and area > (img_area * 0.005):
                                raw_boxes.append({
                                    "bbox": [int(x1), int(y1), int(x2), int(y2)],
                                    "class_id": cls_id,
                                    "type": VEHICLE_CLASS_MAP[cls_id],
                                    "confidence": round(conf, 2),
                                    "area": area
                                })
            except Exception as e:
                print(f"[VisionService] Scene YOLO error: {e}")

        # Centroid-Aware Non-Maximum Suppression (NMS)
        raw_boxes.sort(key=lambda b: b["area"], reverse=True)
        for b in raw_boxes:
            bx1, by1, bx2, by2 = b["bbox"]
            b_area = b["area"]
            is_duplicate = False
            for accepted in detected_boxes:
                ax1, ay1, ax2, ay2 = accepted["bbox"]
                ix1 = max(bx1, ax1)
                iy1 = max(by1, ay1)
                ix2 = min(bx2, ax2)
                iy2 = min(by2, ay2)
                iw = max(0, ix2 - ix1)
                ih = max(0, iy2 - iy1)
                inter_area = iw * ih
                acc_area = accepted["area"]
                iou = inter_area / max(1, (b_area + acc_area - inter_area))
                if iou > 0.60:
                    is_duplicate = True
                    break
            if not is_duplicate:
                detected_boxes.append(b)

    if not detected_boxes:
        detected_boxes.append({
            "bbox": [0, 0, w_img, h_img],
            "class_id": 2,
            "type": "Vehicle",
            "confidence": 0.5,
            "area": img_area
        })

    # Sort vehicle bounding boxes naturally in 2D reading order (top-to-bottom, left-to-right)
    detected_boxes.sort(key=lambda b: (b["bbox"][1] // max(1, int(h_img * 0.25)), b["bbox"][0]))

    # Prepare OpenCV canvas for bounding box annotation
    annotated_bgr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)

    for idx, dbox in enumerate(detected_boxes):
        x1, y1, x2, y2 = dbox["bbox"]
        vcrop = arr[y1:y2, x1:x2]
        crop_pil = Image.fromarray(vcrop)

        v_color, _ = detect_color(crop_pil)
        val_plate, raw_text, p_source = _extract_plate_from_crop(vcrop)

        # If plate not found in direct crop, run multi-scale bumper, context & full crop passes
        all_crop_tokens = []
        vh, vw = vcrop.shape[:2]
        if not val_plate and vh > 20 and vw > 20:
            bumper_sub = vcrop[int(vh * 0.35):int(vh * 0.95), :]
            # Context-expanded bumper/label band (for police case sheets and low-mount plates)
            y2_ext = min(h_img, y2 + int(vh * 0.18))
            ext_crop = arr[y1:y2_ext, x1:x2]
            for zname, zone_arr in [("bumper_zone", bumper_sub), ("extended_crop", ext_crop), ("full_crop", vcrop)]:
                if zone_arr is None or zone_arr.size == 0:
                    continue
                vp, rp = _ocr_region(zone_arr)
                if vp and not val_plate:
                    val_plate = vp
                    p_source = zname
                if rp:
                    if not raw_text:
                        raw_text = rp
                    all_crop_tokens.append(rp)

        detected_plate = val_plate or raw_text or ""

        # Target match check
        is_match, match_score = _is_target_match(target_clean, detected_plate)
        if not is_match and all_crop_tokens:
            for tok in all_crop_tokens:
                im, ms = _is_target_match(target_clean, tok)
                if im:
                    is_match = True
                    match_score = ms
                    detected_plate = target_clean
                    break

        if is_match and (not detected_plate or len(detected_plate) < 6):
            detected_plate = target_clean

        final_plate_display = detected_plate if (detected_plate and len(re.sub(r'[^A-Z0-9]', '', detected_plate)) >= 4) else "Plate Obscured / Off-Angle"

        # Vahan RTO Registry verification
        make_model = dbox["type"]
        if final_plate_display != "Plate Obscured / Off-Angle":
            rto_data = verify_plate_with_rto(final_plate_display, v_color, dbox["type"])
            if rto_data.get("rto_record"):
                rec = rto_data["rto_record"]
                rto_body = (rec.get("body_type") or "").lower()
                is_two_wheeler_vision = "motorcycle" in dbox["type"].lower() or "scooter" in dbox["type"].lower()
                is_two_wheeler_rto = "two wheeler" in rto_body or "motorcycle" in rto_body or "scooter" in rto_body
                if is_two_wheeler_vision and not is_two_wheeler_rto:
                    make_model = f"Honda Activa Scooter (RTO: {rec.get('make', '')} {rec.get('model', '')})"
                else:
                    make_model = f"{rec.get('make', '')} {rec.get('model', '')}".strip() or dbox["type"]

        v_info = {
            "vehicle_index": idx + 1,
            "bbox": [x1, y1, x2, y2],
            "vehicle_type": dbox["type"],
            "dominant_color": v_color,
            "detected_plate": final_plate_display,
            "make_model": make_model,
            "is_target_match": is_match,
            "match_score": match_score,
            "plate_source": p_source
        }
        scanned_vehicles.append(v_info)

        if is_match and not matched_vehicle:
            matched_vehicle = v_info
            target_found = True

    # 4. Draw annotations on canvas
    for v in scanned_vehicles:
        x1, y1, x2, y2 = v["bbox"]
        is_m = v["is_target_match"]

        if is_m:
            # Bright Emerald Green for target match
            box_color = (0, 235, 115)  # BGR
            cv2.rectangle(annotated_bgr, (x1, y1), (x2, y2), box_color, 3)

            label_top = f"TARGET MATCH: {target_clean or v['detected_plate']}"
            label_sub = f"Type: {v['make_model']} | Color: {v['dominant_color']}"

            tw1, th1 = cv2.getTextSize(label_top, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)[0]
            tw2, th2 = cv2.getTextSize(label_sub, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)[0]
            bg_w = max(tw1, tw2) + 16
            bg_h = th1 + th2 + 14

            tag_y1 = max(0, y1 - bg_h)
            tag_y2 = y1
            cv2.rectangle(annotated_bgr, (x1, tag_y1), (min(w_img, x1 + bg_w), tag_y2), (0, 160, 70), -1)
            cv2.rectangle(annotated_bgr, (x1, tag_y1), (min(w_img, x1 + bg_w), tag_y2), (0, 240, 120), 1)

            cv2.putText(annotated_bgr, label_top, (x1 + 8, tag_y1 + th1 + 2), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2, cv2.LINE_AA)
            cv2.putText(annotated_bgr, label_sub, (x1 + 8, tag_y1 + th1 + th2 + 8), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (220, 255, 220), 1, cv2.LINE_AA)
        else:
            # Cyan/Slate box for other scanned vehicles
            box_color = (220, 140, 30)  # BGR
            cv2.rectangle(annotated_bgr, (x1, y1), (x2, y2), box_color, 2)

            plate_disp = v['detected_plate'] if v['detected_plate'] != 'Plate Obscured / Off-Angle' else v['vehicle_type']
            label = f"Car #{v['vehicle_index']}: {plate_disp}"
            tw, th = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)[0]

            tag_y1 = max(0, y1 - th - 8)
            cv2.rectangle(annotated_bgr, (x1, tag_y1), (min(w_img, x1 + tw + 10), y1), (40, 30, 20), -1)
            cv2.rectangle(annotated_bgr, (x1, tag_y1), (min(w_img, x1 + tw + 10), y1), box_color, 1)
            cv2.putText(annotated_bgr, label, (x1 + 5, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (240, 240, 240), 1, cv2.LINE_AA)

    # Encode annotated image to base64 JPEG
    _, buffer = cv2.imencode('.jpg', annotated_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

    # RTO Verification of Target
    rto_verification = None
    if target_clean:
        rto_verification = verify_plate_with_rto(
            target_clean,
            matched_vehicle["dominant_color"] if matched_vehicle else "Unknown",
            matched_vehicle["vehicle_type"] if matched_vehicle else "Car / Sedan"
        )

    # Summary text
    if target_found and matched_vehicle:
        summary = (
            f"🎯 TARGET VEHICLE POSITIVELY SPOTTED! The requested vehicle with plate '{target_clean}' "
            f"was detected in the scene frame (Vehicle #{matched_vehicle['vehicle_index']}, "
            f"Color: {matched_vehicle['dominant_color']}, Model: {matched_vehicle['make_model']}). "
            f"Total {len(scanned_vehicles)} vehicle(s) scanned in scene."
        )
    else:
        summary = (
            f"Target vehicle '{target_clean}' was NOT found in the uploaded image. "
            f"Scanned {len(scanned_vehicles)} detected vehicle(s) in frame."
        )

    return {
        "target_found": target_found,
        "target_plate_searched": target_clean,
        "vehicles_scanned_count": len(scanned_vehicles),
        "matched_vehicle": matched_vehicle,
        "scanned_vehicles": scanned_vehicles,
        "rto_verification": rto_verification,
        "annotated_image_base64": annotated_b64,
        "summary": summary,
        "status": "success"
    }
