# Parallel Run Checklist

## Overview

Tai lieu nay huong dan chay song song giua Google Sheet va he thong moi trong 1-2 ky luong de dam bao do chinh xac truoc khi chuyen hoan toan.

---

## A. KY SONG SONG 1 (2 tuan dau)

### Thoi gian de xuat

| Moc | Ngay | Ghi chu |
|-----|------|---------|
| Bat dau | [DD/MM/YYYY] | Bat dau nhap lieu ca 2 noi |
| Ket thuc | [DD/MM/YYYY] | Ket thuc ky luong |
| So sanh | [DD/MM/YYYY] | Doi chieu ket qua |

### Quy trinh nhap lieu song song

1. **Tai xe** nhap chuyen vao **APP** (he thong moi)
2. **Ke toan** van nhap vao **Google Sheet** nhu cu
3. Cuoi ngay: ke toan doi chieu so chuyen giua 2 nguon

### Checklist hang ngay

- [ ] So chuyen trong APP = so chuyen trong Sheet
- [ ] Tong tan trong APP = tong tan trong Sheet (sai lech <= 0.5%)
- [ ] Chuyen APPROVED trong APP = chuyen da duyet trong Sheet
- [ ] Ghi nhan moi khac biet vao file tracking

---

## B. DOI CHIEU CUOI KY

### Bang doi chieu theo TAI XE

| Ma NV | Ten | Sheet: Tan | App: Tan | Lech | % Lech |
|-------|-----|-----------|----------|------|--------|
| TX0001 | Nguyen Van A | 120.5 | 120.5 | 0 | 0% |
| TX0002 | Tran Van B | 98.3 | 98.0 | 0.3 | 0.3% |
| ... | | | | | |
| **TONG** | | **500.0** | **499.5** | **0.5** | **0.1%** |

### Bang doi chieu theo TUYEN

| Ma tuyen | Sheet: Tan | App: Tan | Lech | % Lech |
|----------|-----------|----------|------|--------|
| R001 | 200.0 | 200.0 | 0 | 0% |
| R002 | 150.0 | 149.8 | 0.2 | 0.13% |
| ... | | | | |

### Bang doi chieu TIEN LUONG

| Ma NV | Ten | Sheet: VND | App: VND | Lech | % Lech |
|-------|-----|------------|----------|------|--------|
| TX0001 | Nguyen Van A | 18,075,000 | 18,075,000 | 0 | 0% |
| TX0002 | Tran Van B | 14,745,000 | 14,700,000 | 45,000 | 0.3% |
| ... | | | | | |

---

## C. NGUONG CHAP NHAN

### Nguong SAI LECH cho phep

| Chi so | Nguong | Ghi chu |
|--------|--------|---------|
| Tan / tai xe | <= 0.5% | Hoac <= 0.5 tan |
| Tan / tuyen | <= 0.5% | Hoac <= 1 tan |
| Tien / tai xe | <= 1% | Hoac <= 100,000 VND |
| Tong tien ky | <= 0.5% | Quan trong nhat |

### Quy tac xu ly sai lech

1. **Sai lech <= nguong**: PASS, ghi nhan va tien hanh
2. **Sai lech > nguong**: FAIL
   - Dieu tra nguyen nhan
   - Sua loi (data hoac tinh toan)
   - Chay lai doi chieu
   - Lap lai cho den khi PASS

---

## D. NGUYEN NHAN SAI LECH THUONG GAP

| Nguyen nhan | Cach xu ly |
|-------------|------------|
| Nhap sai trong luong | Sua trong Sheet/App, chay lai |
| Chuyen bi trung lap | Xoa duplicate |
| Chuyen thieu trong mot nguon | Bo sung |
| Don gia khac nhau | Kiem tra rule, dong nhat |
| Lam tron khac nhau | Thong nhat cach lam tron |

---

## E. KY SONG SONG 2 (tuy chon)

Neu ky 1 con nhieu sai lech, chay them ky 2:

### Dieu kien chay ky 2

- Sai lech ky 1 > 1%
- Co loi he thong can sua
- Nguoi dung can thoi gian lam quen

### Thoi gian ky 2

| Moc | Ngay | Ghi chu |
|-----|------|---------|
| Bat dau | [DD/MM/YYYY] | |
| Ket thuc | [DD/MM/YYYY] | |
| So sanh | [DD/MM/YYYY] | |

---

## F. TIEU CHI CUTOVER

### Dieu kien de chuyen hoan toan sang APP

- [ ] Ky song song 1 (hoac 2): sai lech <= nguong cho phep
- [ ] Tat ca tai xe da duoc dao tao
- [ ] Tat ca ke toan da su dung thanh thao
- [ ] Backup du lieu Sheet da hoan tat
- [ ] Sheet da chuyen sang read-only
- [ ] Team IT san sang ho tro 7 ngay dau

### Quyet dinh

| Ngay | Nguoi duyet | Ket luan |
|------|-------------|----------|
| [DD/MM/YYYY] | [Ten CTO/Manager] | GO / NO-GO |

---

## G. TRACKING FILE

Tao file Excel/Sheet de tracking hang ngay:

```
parallel_run_tracking.xlsx
├── Tab: Daily Summary
│   ├── Date
│   ├── Sheet trips count
│   ├── App trips count
│   ├── Difference
│   └── Notes
├── Tab: Driver Comparison
│   └── [Bang doi chieu theo tai xe]
├── Tab: Issues
│   ├── Date
│   ├── Issue description
│   ├── Root cause
│   ├── Resolution
│   └── Status
└── Tab: Sign-off
    └── [Xac nhan cua cac ben lien quan]
```

---

## H. LIEN HE HO TRO

| Vai tro | Ten | Lien he |
|---------|-----|---------|
| IT Support | [Ten] | [Email/Phone] |
| Project Manager | [Ten] | [Email/Phone] |
| Ke toan Lead | [Ten] | [Email/Phone] |
