# Milestone 3 Step 2 — manual validation

Install the Step 2 archive as the winning Living Past mod with SkyrimNet 1.1.1, Magelight 1.8.0 and PapyrusUtil. Enable the Living Past SkyrimNet bundle and start a disposable new game.

1. Open Living Past with Insert. Create different relationship labels and histories for Ysolda and Carlotta before meeting either. Include Unicode and multiple lines in one history. Save the game and its SKSE co-save.
2. Reload the save. Open each entry, check its label and exact history, edit one and confirm the other remains unchanged. Save again. Load the earlier save and verify rollback.
3. Speak to each NPC separately without mentioning the private markers. Inspect the full SkyrimNet request payloads and check each direct response contains only that NPC's history. Confirm their responses reflect the relationship naturally.
4. Before either marker has been spoken aloud, check another NPC's request while both are nearby, as well as hidden-player dialogue, thoughts, warmup and dynamic biography requests. Neither private marker should appear.
5. Interrupt an activation, reopen and check that the previous saved history remains active. If the activation acknowledgement is lost, reopen and inspect the saved history before retrying.

The Step 1 experimental Ysolda entry uses separate storage keys and is not imported by this increment. Save the game after activating a relationship. Automated checks do not establish in-game prompt isolation or NPC behavior.
