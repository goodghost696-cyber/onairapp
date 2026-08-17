# Politique de confidentialité — VOLTA

> ## ⚠️ Document incomplet — base de travail, à faire relire
>
> **Ce fichier n'est PAS une politique de confidentialité complète et ne doit
> pas être publié en l'état.**
>
> Il ne contient qu'**une seule section**, rédigée le 2026-08-17 en même temps
> que la mise en place du consentement au partage de données coach↔membre.
> Elle décrit un dispositif qui existe réellement dans l'application et qui a
> été vérifié en conditions réelles (voir `JOURNAL.md`), mais :
>
> - une politique de confidentialité complète doit aussi couvrir l'identité du
>   responsable de traitement, les bases légales de chaque traitement, les
>   durées de conservation, les destinataires et sous-traitants (Supabase,
>   Vercel, Anthropic, Open Food Facts, wger.de…), les transferts hors UE, les
>   droits des personnes et les modalités de leur exercice, ainsi que les
>   cookies et traceurs ;
> - **rien ici n'a été relu par un juriste.** Le texte de cette section a été
>   fourni tel quel et n'est pas une rédaction juridique validée ;
> - le point ouvert « consentement au partage de données coach↔membre » de la
>   section *Chantiers ouverts* de `JOURNAL.md` reste ouvert tant que cette
>   relecture n'a pas eu lieu, même si la partie technique est faite.
>
> Autrement dit : le code est prêt, le document ne l'est pas.

---

## Partage de vos données avec votre coach

Lorsque vous êtes rattaché(e) à un coach au sein de VOLTA FITNESS, celui-ci a accès, via son espace coach, aux données suivantes que vous renseignez dans l'application : poids, taille, objectifs, données nutritionnelles (repas, calories, macronutriments), activité physique, sommeil, et séances d'entraînement.

Cet accès nécessite votre consentement explicite, recueilli au moment de votre rattachement à un coach. Vous pouvez retirer ce consentement à tout moment depuis Réglages → Confidentialité. Le retrait de ce consentement suspend l'accès de votre coach à ces données mais n'affecte pas leur conservation ni votre propre usage de l'application.

Votre coach ne peut pas accéder à vos messages échangés avec d'autres membres, ni aux données d'autres membres qui ne lui sont pas assignés.

---

## Note technique (à retirer avant publication)

Correspondance entre les affirmations ci-dessus et leur mise en œuvre réelle,
pour que la relecture juridique puisse s'appuyer sur des faits vérifiables
plutôt que sur des intentions :

| Affirmation | Mise en œuvre |
|---|---|
| « nécessite votre consentement explicite » | Colonne `profiles.coach_data_consent`, défaut `false`. Aucun consentement n'a été présumé, y compris pour les comptes créés avant le dispositif. |
| « recueilli au moment de votre rattachement » | `CoachConsentGate.jsx`, affiché tant que le membre a une salle et n'a jamais tranché (`coach_data_consent_at IS NULL`). Case non pré-cochée. |
| « retirer à tout moment depuis Réglages → Confidentialité » | Section Confidentialité de `Settings.jsx`. |
| « suspend l'accès de votre coach » | Appliqué en **RLS PostgreSQL**, pas côté interface : 6 policies (`profiles`, `repas`, `activite_jour`, `seances`, `objectifs` en lecture et écriture) exigent `member_shares_with_coach(user_id)`. Sans consentement, les requêtes du coach ne renvoient rien. |
| « n'affecte pas leur conservation ni votre propre usage » | Aucune donnée n'est supprimée ; les policies « own data » du membre sont inchangées. |
| « ne peut pas accéder à vos messages échangés avec d'autres membres » | Policy `messages` : `auth.uid() = sender_id OR auth.uid() = receiver_id`. Vérifié par test réel en Phase 2 de l'audit, y compris sur le canal temps réel. |

**Limite connue, à arbitrer** : les habitudes assignées par le coach
(`habitudes`, `habitude_logs`) et les programmes (`programmes`,
`programme_assignations`) ne sont **pas** couverts par le consentement. Ce
sont des contenus que le coach a lui-même créés et assignés, et ils
n'apparaissent pas dans la liste de données ci-dessus — mais `habitude_logs`
contient bien une donnée de suivi du membre (ses validations quotidiennes).
À trancher : soit les ajouter au périmètre du consentement, soit les
mentionner explicitement dans le texte comme relevant du suivi assigné.

**Conséquence de conception à connaître** : PostgreSQL n'a pas de RLS au
niveau colonne, et `poids`/`taille`/`objectif` vivent sur la ligne `profiles`
du membre. Couper réellement l'accès à ces trois champs impose donc de
masquer la ligne entière — un membre sans consentement disparaît aussi des
listes du coach (liste de clients, tableau de bord, liste de conversations).
C'est le comportement actuel, et il est cohérent avec un refus de partage,
mais il mérite d'être assumé explicitement côté produit.
