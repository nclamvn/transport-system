# Go-Live Runbook

## Overview

Tai lieu nay huong dan cac buoc thuc hien khi chuyen tu Google Sheet sang he thong moi (cutover).

---

## A. TONG QUAN TIMELINE

| Giai doan | Thoi gian | Nguoi chiu trach nhiem |
|-----------|-----------|------------------------|
| T-7 ngay | Chuan bi | IT + PM |
| T-3 ngay | Final check | IT + Ke toan |
| T-1 ngay | Freeze Sheet | PM + Management |
| T=0 (Go-Live) | Switch | IT + All |
| T+1 den T+7 | Hypercare | IT + Support |

---

## B. T-7 NGAY: CHUAN BI

### B1. Backup du lieu

```bash
# Backup PostgreSQL
pg_dump -h localhost -U postgres transport_db > backup_T-7_$(date +%Y%m%d).sql

# Verify backup
ls -la backup_*.sql
```

- [ ] Backup DB thanh cong
- [ ] Test restore backup len moi truong staging
- [ ] Luu backup ra external storage (Google Drive / S3)

### B2. Kiem tra he thong

- [ ] API server chay on dinh
- [ ] Web app truy cap duoc
- [ ] Mobile app (neu co) hoat dong
- [ ] SSL certificate con hieu luc (> 30 ngay)
- [ ] Database connection pool du
- [ ] Log rotation duoc cau hinh

### B3. Chuan bi tai khoan

- [ ] Tat ca tai xe co tai khoan dang nhap
- [ ] Tat ca ke toan co tai khoan voi role HR
- [ ] ADMIN account da san sang
- [ ] Password mac dinh da gui cho nguoi dung

### B4. Tai lieu va dao tao

- [ ] Huong dan su dung cho tai xe
- [ ] Huong dan su dung cho ke toan
- [ ] FAQ da chuan bi
- [ ] Video huong dan (neu co)
- [ ] Session dao tao da hoan tat

---

## C. T-3 NGAY: FINAL CHECK

### C1. Import du lieu lich su

```bash
# Dry-run truoc
cd apps/api
npx ts-node scripts/import_from_sheets.ts --dry-run --source=csv --dir=/path/to/data

# Review bao cao
cat /path/to/data/import_errors.log

# Apply neu khong co loi
npx ts-node scripts/import_from_sheets.ts --apply --source=csv --dir=/path/to/data
```

- [ ] Import drivers: OK
- [ ] Import vehicles: OK
- [ ] Import stations: OK
- [ ] Import routes: OK
- [ ] Import trips (lich su): OK
- [ ] Verify count khop voi sheet

### C2. Verify tinh nang

- [ ] Dashboard hien thi dung so lieu
- [ ] Salary calculation tinh dung
- [ ] Review flow hoat dong
- [ ] Mobile trip input hoat dong
- [ ] Export Excel hoat dong

### C3. Thong bao nguoi dung

- [ ] Email thong bao go-live date gui
- [ ] Nhac nho hoan tat cong viec tren Sheet truoc cutover
- [ ] Hotline ho tro da duoc cong bo

---

## D. T-1 NGAY: FREEZE SHEET

### D1. Chot cong viec tren Sheet

- [ ] Tat ca chuyen da duoc nhap
- [ ] Tat ca chuyen da duoc duyet/tu choi
- [ ] Ky luong hien tai da duoc chot (neu co)

### D2. Freeze Google Sheet

1. Vao Google Sheet
2. File > Share > General access: **"Viewer"** (chi xem, khong sua)
3. Hoac: Data > Protected sheets > Protect entire sheet

- [ ] Sheet da chuyen sang READ-ONLY
- [ ] Thong bao cho tat ca nguoi dung

### D3. Final backup

```bash
# Export Sheet thanh CSV
# Luu vao thu muc final_export/

# Backup DB lan cuoi truoc go-live
pg_dump -h localhost -U postgres transport_db > backup_T-1_$(date +%Y%m%d).sql
```

- [ ] CSV export da luu
- [ ] DB backup T-1 da luu

---

## E. T=0: GO-LIVE

### E1. Cutover checklist (sang som)

**06:00 - 07:00: Chuan bi**

- [ ] IT team san sang
- [ ] Monitoring dashboard mo
- [ ] Slack/Telegram channel ho tro san sang

**07:00 - 08:00: Switch**

- [ ] Thong bao bat dau go-live
- [ ] Tat cac job tu dong tren Sheet (neu co)
- [ ] Verify Sheet da READ-ONLY

**08:00+: Nguoi dung bat dau su dung**

- [ ] Tai xe dang nhap APP nhap chuyen
- [ ] Ke toan dang nhap Web duyet chuyen
- [ ] Monitor log loi

### E2. Health check moi 30 phut

| Thoi gian | API | Web | DB | Loi | Ghi chu |
|-----------|-----|-----|----|----|---------|
| 08:00 | OK | OK | OK | 0 | |
| 08:30 | OK | OK | OK | 0 | |
| 09:00 | OK | OK | OK | 1 | User quen mat khau |
| ... | | | | | |

### E3. Xu ly su co

| Su co | Muc do | Xu ly |
|-------|--------|-------|
| User khong dang nhap duoc | Thap | Reset password |
| API loi 500 | Cao | Check log, restart neu can |
| DB connection error | Cao | Check connection pool |
| Mobile app crash | Trung binh | Guide user cai lai |

---

## F. T+1 DEN T+7: HYPERCARE

### F1. Ho tro hang ngay

- [ ] Kiem tra log loi moi sang
- [ ] Tra loi cau hoi tu nguoi dung
- [ ] Fix bug hotfix neu can
- [ ] Bao cao tinh hinh cuoi ngay

### F2. Daily standup

| Ngay | Van de gap | Xu ly | Trang thai |
|------|-----------|-------|------------|
| T+1 | 3 user quen MK | Reset | Done |
| T+2 | ... | ... | ... |
| ... | | | |

### F3. Tieu chi ket thuc Hypercare

- [ ] 3 ngay lien tuc khong co loi nghiem trong
- [ ] So luong ho tro giam dan
- [ ] Nguoi dung tu tin su dung
- [ ] Backup tu dong hoat dong

---

## G. ROLLBACK PLAN

### Khi nao rollback?

- He thong ngung hoat dong > 2 gio
- Mat du lieu nghiem trong
- Loi bao mat nghiem trong
- Management quyet dinh

### Cac buoc rollback

1. **Thong bao** nguoi dung tam ngung su dung APP
2. **Mo lai** Google Sheet (bo READ-ONLY)
3. **Export** du lieu moi tu APP ra CSV
4. **Nhap** du lieu moi vao Sheet
5. **Thong bao** tiep tuc dung Sheet

```bash
# Export trips moi tu DB
psql -h localhost -U postgres transport_db -c "
  COPY (
    SELECT * FROM trips
    WHERE created_at >= '2024-12-XX'
    ORDER BY created_at
  ) TO '/tmp/new_trips.csv' WITH CSV HEADER;
"
```

### Sau khi rollback

- [ ] Dieu tra nguyen nhan
- [ ] Fix loi
- [ ] Len ke hoach go-live lai
- [ ] Thong bao nguoi dung

---

## H. CONTACTS

| Vai tro | Ten | SDT | Email |
|---------|-----|-----|-------|
| IT Lead | [Ten] | [SDT] | [Email] |
| DBA | [Ten] | [SDT] | [Email] |
| PM | [Ten] | [SDT] | [Email] |
| Business Owner | [Ten] | [SDT] | [Email] |

### Escalation path

1. IT Support → IT Lead (15 phut khong xu ly duoc)
2. IT Lead → PM + Business Owner (su co nghiem trong)
3. PM → Management (can quyet dinh rollback)

---

## I. SIGN-OFF

| Vai tro | Ten | Chu ky | Ngay |
|---------|-----|--------|------|
| IT Lead | | | |
| PM | | | |
| Business Owner | | | |
| CTO | | | |

---

## J. POST GO-LIVE

### Sau 1 thang

- [ ] Review performance
- [ ] Thu thap feedback nguoi dung
- [ ] Len ke hoach Phase 2

### Kho khan thuong gap va cach xu ly

| Kho khan | Xu ly |
|----------|-------|
| Nguoi dung quen giao dien | Training bo sung |
| Bao cao khong nhu Sheet cu | Tuy chinh bao cao |
| Performance cham | Toi uu query, them index |
| Thieu tinh nang X | Len backlog Phase 2 |
