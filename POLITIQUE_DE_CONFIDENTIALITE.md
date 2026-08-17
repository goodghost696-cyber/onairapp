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
>
> ### 📋 La liste de données ci-dessous doit être maintenue à jour
>
> La section « Partage de vos données avec votre coach » énumère **nommément**
> les catégories de données auxquelles le coach accède. Cette liste est une
> promesse faite à l'utilisateur : elle n'est vraie que tant qu'elle
> correspond exactement à ce que le code expose.
>
> **À chaque nouvelle fonctionnalité de suivi** (une nouvelle métrique, une
> nouvelle table de données membre, un nouvel écran coach), deux gestes sont
> obligatoires et vont ensemble :
>
> 1. ajouter la condition `member_shares_with_coach()` à la policy RLS qui
>    ouvre cette donnée au coach — sinon elle fuite hors du consentement ;
> 2. ajouter la catégorie correspondante à la liste de cette section — sinon
>    le document ment par omission.
>
> Oublier le premier crée une fuite ; oublier le second crée un écart entre
> ce qui est annoncé et ce qui est fait. Le cas s'est déjà produit : les
> validations d'habitudes (`habitude_logs`) avaient été laissées hors du
> périmètre à la première passe, et ont été rattrapées le 2026-08-17.

---

## Partage de vos données avec votre coach

Lorsque vous êtes rattaché(e) à un coach au sein de VOLTA FITNESS, celui-ci a accès, via son espace coach, aux données suivantes que vous renseignez dans l'application : poids, taille, objectifs, données nutritionnelles (repas, calories, macronutriments), activité physique, sommeil, séances d'entraînement, et vos validations d'habitudes.

Que vous ayez ou non donné cet accord, votre coach voit que vous faites partie de sa salle : votre prénom et votre date de rattachement. Ces informations d'appartenance ne sont pas couvertes par le consentement ci-dessous ; elles ne comportent aucune donnée de suivi.

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
| « suspend l'accès de votre coach » | Appliqué en **RLS PostgreSQL**, pas côté interface : 7 policies (`profiles`, `repas`, `activite_jour`, `seances`, `objectifs` en lecture et écriture, `habitude_logs`) exigent `member_shares_with_coach(user_id)`. Sans consentement, les requêtes du coach ne renvoient rien. |
| « votre coach voit que vous faites partie de sa salle » | Vue `coach_member_identity` : prénom, rattachement, date, état du consentement. Aucune donnée de suivi, pas d'email, pas de poids/taille/objectif. SECURITY DEFINER auto-restreinte par `is_coach()` + `my_gym_id()`. |
| « n'affecte pas leur conservation ni votre propre usage » | Aucune donnée n'est supprimée ; les policies « own data » du membre sont inchangées. |
| « ne peut pas accéder à vos messages échangés avec d'autres membres » | Policy `messages` : `auth.uid() = sender_id OR auth.uid() = receiver_id`. Vérifié par test réel en Phase 2 de l'audit, y compris sur le canal temps réel. |

**Arbitrage rendu le 2026-08-17** : `habitude_logs` (les validations
quotidiennes du membre) **est** désormais couvert par le consentement et
figure dans la liste ci-dessus. `habitudes` (l'intitulé de l'habitude
assignée), `programmes` et `programme_assignations` restent hors périmètre :
ce sont des contenus créés par le coach lui-même, pas des données produites
par le membre. Un coach continue donc de voir ce qu'il a assigné, sans voir
si le membre l'a fait.

**Séparation identité / données de suivi (2026-08-17)** : PostgreSQL n'a pas
de RLS au niveau colonne, et `poids`/`taille`/`objectif` vivent sur la même
ligne `profiles` que le prénom. Gater cette ligne entière — l'état de la
première passe — coupait bien l'accès aux données sensibles, mais faisait
aussi disparaître le membre de toutes les listes du coach, y compris la
messagerie. Résolu par la vue `coach_member_identity` : l'appartenance à la
salle est lisible sans consentement, les données de suivi restent gatées.
Un membre qui refuse reste donc visible et joignable, avec un état explicite
« n'a pas encore partagé ses données » ou « a retiré l'accès à ses données »
— jamais des compteurs à zéro qui le feraient passer pour inactif.
