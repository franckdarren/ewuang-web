# Guide de Configuration Supabase Storage pour ewuang-web

## 🔍 Problème Identifié

L'upload d'images échoue à cause d'une politique RLS (Row Level Security) Supabase qui bloque l'insertion de fichiers dans le bucket de storage, même si le code utilise déjà le `SUPABASE_SERVICE_ROLE_KEY`.

## ✅ Solution : Configurer le Bucket et les Politiques RLS

### Étape 1 : Accéder au Dashboard Supabase

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet **ewuang**
3. Dans le menu de gauche, cliquez sur **Storage**

### Étape 2 : Vérifier si les buckets existent

Dans l'onglet **Buckets**, vérifiez si les buckets suivants existent :
- `articles-images`
- `variations-images`

### Étape 3A : Si les buckets n'existent PAS

1. Cliquez sur **New bucket**
2. Pour le bucket `articles-images` :
   - **Name:** `articles-images`
   - **Public bucket:** ✅ Coché (pour que les URLs soient accessibles)
   - **File size limit:** 5 MB
   - **Allowed MIME types:** `image/jpeg, image/png, image/webp`
   - Cliquez sur **Create bucket**

3. Répétez pour `variations-images`

### Étape 3B : Si les buckets existent déjà

Passez directement à l'étape 4.

### Étape 4 : Configurer les Politiques RLS

1. Dans le menu de gauche, cliquez sur **SQL Editor**
2. Cliquez sur **New query**
3. Copiez-collez le contenu du fichier [`supabase_storage_setup.sql`](supabase_storage_setup.sql)
4. Cliquez sur **Run** (bouton en bas à droite)

### Étape 5 : Vérifier la Configuration

1. Retournez dans **Storage**
2. Cliquez sur le bucket `articles-images`
3. Cliquez sur **Policies** (onglet en haut)
4. Vous devriez voir 4 politiques :
   - ✅ Allow authenticated uploads to articles-images
   - ✅ Allow public read access to articles-images
   - ✅ Allow authenticated updates to articles-images
   - ✅ Allow authenticated deletes from articles-images

## 🧪 Tester l'Upload

Après la configuration :

1. Redémarrez votre serveur de développement :
   ```bash
   npm run dev
   # ou
   yarn dev
   ```

2. Essayez de créer un article avec une image

3. Vérifiez dans le dashboard Supabase > Storage > articles-images que le fichier a bien été uploadé

## 🔧 Alternative : Utiliser la CLI Supabase (Avancé)

Si vous préférez utiliser la CLI :

```bash
# Installer la CLI Supabase
npm install -g supabase

# Se connecter
supabase login

# Lier votre projet
supabase link --project-ref <VOTRE_PROJECT_REF>

# Appliquer les migrations
supabase db push
```

## 📝 Variables d'Environnement Requises

Vérifiez que ces variables sont bien configurées dans votre `.env.local` et sur Vercel :

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

⚠️ **IMPORTANT** : Le `SUPABASE_SERVICE_ROLE_KEY` doit être défini côté serveur uniquement (jamais exposé au frontend).

## 🚨 Sécurité Avancée (Optionnel)

Pour renforcer la sécurité, vous pouvez modifier les politiques pour vérifier le rôle de l'utilisateur :

```sql
-- Exemple : Autoriser uniquement les vendeurs
CREATE POLICY "Allow vendors only"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'articles-images' AND
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'vendeur'
    )
);
```

## ❓ Problèmes Courants

### L'upload échoue toujours

- Vérifiez que le bucket est bien **public**
- Vérifiez que les politiques RLS sont bien créées
- Vérifiez les logs côté serveur pour voir l'erreur exacte
- Vérifiez que la variable `SUPABASE_SERVICE_ROLE_KEY` est bien définie

### Les images ne s'affichent pas

- Vérifiez que le bucket est **public**
- Vérifiez l'URL générée : `https://your-project.supabase.co/storage/v1/object/public/articles-images/...`
- Vérifiez les CORS dans Supabase (Storage > Configuration)

### Erreur 413 (Payload too large)

- Vérifiez la taille du fichier (max 5 MB par défaut)
- Modifiez `file_size_limit` dans la configuration du bucket

## 📞 Support

Si le problème persiste :
1. Vérifiez les logs serveur : `npm run dev`
2. Vérifiez les logs Supabase : Dashboard > Logs
3. Ouvrez une issue sur le repo GitHub

---

**Dernière mise à jour :** 2026-02-16
