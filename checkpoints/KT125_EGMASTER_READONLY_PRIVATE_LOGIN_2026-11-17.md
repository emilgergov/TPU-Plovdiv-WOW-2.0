# КТ125 — ЕГМАСТЕР: профил в D1 и защитен постоянен вход, 17.11.2026

Потребителят показа реални D1 резултати: `kt125_users` съдържа `egmaster-primary`, роля `egmaster`, активен `1`; `kt125_audit` съдържа `users.bootstrap`/`created` с `source=manual-reconciliation`. Няма основание да се изпълнява нов INSERT. Профилът е въведен ръчно с Cloudflare `user_uuid`; **съвпадението с подписания JWT `sub` не е проверено реално**.

Разработен е самостоятелен еднофайлов частен Worker `KT125_EGMASTER_PRIVATE_ADMIN_WORKER.txt` (SHA-256 `e802e657ba582a34c9a3a8c73f1d350b35af590a03f5f5cb970dc0589a6f5a66`) за временно безопасно въвеждане на постоянното удостоверяване. Използва pinned Cloudflare Access issuer/AUD, RS256 подпис и JWKS; не разчита на ctx.access; валидира JWT sub чрез точно DB равенство `identity_provider` + `provider_subject` и `egmaster`, `active=1`, `organization_id=riosv-plovdiv`. Дава пет справочни страници `/kt125/admin/{overview,users,roles,cases,audit}`. `/kt125/bootstrap` връща 410; няма INSERT/UPDATE/DELETE. Не излага съдържание на преписки.

Локални Node22 тестове: PASS — истински подписан RSA JWT, отказ на чужд AUD, изтекъл/липсващ токен, чужд subject, работа с D1 mock и преглед, забранен bootstrap и POST. **Реален deployment и реален вход все още не са потвърдени.** При несъвпадение на subject да НЕ се въвежда нов потребител и да НЕ се изменя provider_subject на сляпо; първо да се установи действителната подписана самоличност.

Не е променян стабилният KT124-R6 (`1e949e654f9d002f51f7e0b0e8629a78f43512d1`) или AI Worker. Това е минимален read-only управленски вход, а не пълната разрешителна функционалност на KT125. Тя остава за приемка след реалния вход.
