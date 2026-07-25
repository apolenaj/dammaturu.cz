# Supabase — studijní materiály

## Co spustit

1. Otevři [Supabase Dashboard](https://supabase.com/dashboard) → svůj projekt → **SQL Editor**.
2. Vlož celý obsah souboru `migrations/20260725120000_study_materials.sql`.
3. Klikni **Run**.

Skript vytvoří:

- tabulku `public.study_materials` (systémové + uživatelské materiály),
- RLS politiky (systém vidí všichni přihlášení, vlastní jen majitel),
- Storage bucket `user_materials` (privátní, max. 20 MB, PDF/DOCX/TXT),
- seed systémového učiva (ČJL, Matematika, Angličtina).

## Ověření

```sql
SELECT title, subject, type FROM study_materials WHERE type = 'system';
SELECT id, name, public FROM storage.buckets WHERE id = 'user_materials';
```

Po migraci obnov `/materialy` — měla by se zobrazit sekce **Naše učivo**.
