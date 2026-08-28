-- Migration 063: CS 161 — Computer Security, full deck rebuild.
-- UC Berkeley Fall 2026: David Wagner and Peyrin Kao (MoWeFr 12:00, Physics 1).
-- Catalog: intro to computer security. Cryptography (encryption, authentication,
-- hash functions, protocols, applications). OS security, access control. Network
-- security, firewalls, viruses, worms. Software security, defensive programming,
-- language-based security. Case studies from real-world systems.
-- Prereq: CS 61B, CS 61C, and CS 70.
-- Text: CS 161 course notes (cs161.org). Sequence follows fa26.cs161.org.
-- Cards are conceptual (definitions, properties, defenses). They do not include
-- exploit steps, payloads, or reproduction procedures.

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'cs161');

DELETE FROM public.tidbits
WHERE category_id = 'cs161';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'cs161');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'cs161');

UPDATE public.decks
SET title = 'CS 161',
    description = 'Computer Security — Wagner/Kao: principles, memory safety, crypto, web, TLS',
    cover_emoji = '🔐'
WHERE slug = 'cs161';

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('principles',     'Security Principles',
   'CIA, threat models, TCB, least privilege (Ch. 1)', 0),
  ('memory-safety',  'Memory Safety & the Stack',
   'x86 call stack, overflow classes, C undefined behavior', 1),
  ('mitigations-os', 'Mitigations, Isolation & Access Control',
   'Canaries, NX, ASLR, processes, DAC vs MAC', 2),
  ('symmetric',      'Symmetric Encryption',
   'OTP, AES, modes, IND-CPA, unique IVs', 3),
  ('integrity-ae',   'Hashes, MACs, Signatures & AE',
   'Collision resistance, HMAC, encrypt-then-MAC, PKI intro', 4),
  ('public-key',     'Public-Key Crypto & DH',
   'Diffie-Hellman, hybrid encryption, certificates', 5),
  ('networks-tls',   'Networks, TLS & End-to-End',
   'On-path attackers, TLS goals, what crypto does not solve', 6),
  ('web-basics',     'Web Apps, Cookies & SOP',
   'HTTP cookies, same-origin policy, sessions, passwords', 7),
  ('web-attacks',    'SQLi, XSS, CSRF & UI Security',
   'Injection classes and standard defenses (no payloads)', 8),
  ('cases-ai',       'AI Security & Case Studies',
   'Prompt injection, Signal, iPhone, Project 2/3 design', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'cs161'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Security Principles
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'principles'
CROSS JOIN (VALUES
  (0,  'CS 161 (Wagner / Kao) in one sentence',
       'Reason about adversaries: what they can do, what you must protect, and which mechanism actually provides that property. 61C gives you the machine; 70 gives you probability; 161 asks who is trying to break it (fa26.cs161.org).'),
  (1,  'CIA triad',
       'Confidentiality: secrets stay secret. Integrity: data is not altered undetected. Availability: the service stays up. Exams will ask which one a bug violates — a website defacement is integrity; a stolen password file is confidentiality; a DDoS is availability.'),
  (2,  'authentication vs. authorization',
       'Authentication: who are you? Authorization: what may you do? A correct login that then reads someone else''s files failed authorization. Cookies and sessions mix both; name them separately on the exam.'),
  (3,  'threat model',
       'Write down the attacker''s goals, capabilities (network on-path? local user? malicious JS in the browser?), and what is out of scope. A design that "stops hackers" without a threat model is not a 161 answer. Project 2 starts here.'),
  (4,  'trusted computing base (TCB)',
       'The TCB is the set of components you must trust for the security claim to hold. Smaller TCB is better. If your "secure" chat trusts the OS, the browser, and a hundred npm packages, say so — that is the TCB, not a footnote.'),
  (5,  'least privilege',
       'Give each principal only the rights it needs, for only as long as it needs them. A web worker that can DROP TABLE has too much privilege. SETUID binaries and overly broad IAM roles are 161 running examples.'),
  (6,  'defense in depth',
       'Layer independent controls so one failure is not total failure (W^X plus ASLR plus canaries; TLS plus application auth). Depth is not "the same check twice." Correlated failures (one bug in a library used by every layer) do not count as depth.'),
  (7,  'fail-safe defaults / complete mediation',
       'Fail-safe: if unsure, deny. Complete mediation: every access is checked, not only the first one (TOCTOU is the classic miss). Psychological acceptability: if the secure path is painful, users will route around it.'),
  (8,  'Kerckhoffs''s principle',
       'Security should not depend on keeping the algorithm secret — only the key. 161 will dock you for "security through obscurity" as the main defense. Open designs (AES, TLS) are inspected; secret homebrew ciphers are not stronger.'),
  (9,  'don''t roll your own crypto',
       'Use a vetted library and a high-level API (authenticated encryption, TLS). Concatenating AES and a hash "because it feels right" is how you get padding oracles and missing MACs. Project 2: pick primitives, then justify the composition.'),
  (10, 'assume a capable adversary',
       'They read your source, they try the obvious, they combine bugs. They are not "too dumb to find the hidden admin URL." They may be on-path on Wi-Fi, or they may run JS in a victim''s browser — those are different models.'),
  (11, 'policy vs. mechanism',
       'Policy: the English (or spec) of who may do what. Mechanism: the bits that enforce it. A correct MAC does not tell you the sharing policy for Project 2; ACLs and capabilities are mechanisms that implement a policy you still have to write.'),
  (12, 'economics and incentives',
       'Attackers optimize cost. A $5 phishing kit vs. a $1M 0-day. Defenders have finite time. 161 case studies (iPhone, Signal) are partly "what is expensive to break given this threat model?" not only "is the math true."'),
  (13, 'safety vs. security',
       'Safety: the system does not harm the world by accident (avionics). Security: it withstands a malicious party. Memory unsafety is both a reliability bug and an attacker primitive. Language-based security (catalog) is choosing a safer mechanism.'),
  (14, '161 exam habit',
       'Name the property (confidentiality / integrity / authenticity / availability), the attacker (who, where), and the mechanism. "Use encryption" without saying of what, with what key, and against whom is not full credit.')
) AS c(pos, front, back)
WHERE d.slug = 'cs161'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 2. Memory Safety (conceptual)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'memory-safety'
CROSS JOIN (VALUES
  (0,  'memory safety as a property',
       'A memory-safe language never lets a program read or write outside the objects the abstract machine defined. C and C++ are not memory-safe. Java, Python, and safe Rust are (modulo FFI and VM bugs). 161 Project 1 lives in the C/x86 world of 61C.'),
  (1,  'x86 call stack (61C review)',
       'A frame holds saved return address, saved frame pointer, and locals. The stack grows toward lower addresses. A buffer in a local array sits near control data. 161 cares because overflowing that buffer can corrupt control data — the class of bug, not a recipe.'),
  (2,  'buffer overflow (class of bug)',
       'Writing more bytes into a fixed-size buffer than it can hold overwrites neighboring memory. On the stack that neighbor may be a saved return address or a function pointer. The secure fix is bounds checking or a memory-safe language, not "hoping the input is short."'),
  (3,  'why gets and unbounded strcpy are banned',
       'They copy until a terminator with no destination length. CS 161 (and any modern style guide) treats them as always-vulnerable APIs. Use APIs that take a destination size and check it. Compiler warnings exist because this class of bug is decades old.'),
  (4,  'integer overflow as a memory bug',
       'If a length calculation wraps, malloc can return a tiny region and a later copy still uses the large length. The overflow is in the integer, the memory safety failure is the subsequent write. Check sizes before allocating and copying; use saturating or checked arithmetic.'),
  (5,  'use-after-free and double-free',
       'Freeing a heap object and then using the pointer, or freeing twice, is undefined behavior that allocators may turn into corrupted heap metadata. Defenses: never use a pointer after free (NULL it), use a GC or borrow checker, and run sanitizers in tests.'),
  (6,  'format-string bugs (idea)',
       'If an attacker controls the format string of printf, they can induce extra memory reads or writes that the programmer did not intend. Defense: always use a constant format string; pass user data as an argument, never as the format.'),
  (7,  'C undefined behavior and "it works on my machine"',
       'Out-of-bounds access is not a defined "overwrite the next local." Compilers may delete checks, and layouts change with optimization. 161 still uses a simplified stack picture for exams, but Valgrind/ASan are how you debug Project 1 honestly.'),
  (8,  'code injection vs. control-flow hijack (idea)',
       'Historically, overflowing into executable stack memory let attackers run injected instructions. Modern W^X makes that much harder, so later lectures talk about reusing existing code. The exam distinction: data executed as code vs. corrupting a saved return address.'),
  (9,  'heap vs. stack overflows',
       'Same class (out-of-bounds write), different neighbors (heap metadata / object fields vs. saved registers). Isolation between processes still does not stop an overflow inside one process. Fix the bounds; do not "move it to the heap" as a security plan.'),
  (10, 'command injection (related, not the same)',
       'Passing unsanitized input to a shell or SQL concatenates data into a control channel. That is a different 161 unit (web/OS) but the same lesson: never mix untrusted data into a language the computer will parse as code. Use APIs with separate argument lists.'),
  (11, 'why 161 still teaches x86 for this',
       'The calling convention makes the return address a data value in memory. Once you see that, "memory safety matters" is concrete. RISC-V Project 3 from 61C is the same idea with ra saved on the stack. The vulnerability is the missing bound, not the ISA brand.'),
  (12, 'Project 1 (what it is testing)',
       'A teaching VM with intentionally buggy C. The learning goal is to recognize which bug class you are looking at and which mitigation would have blocked it. Course staff provide the environment; this deck does not walk through exploiting it.'),
  (13, 'language-based security (catalog)',
       'If the language forbids the bad operation, a whole bug class disappears (array bounds, no raw pointers). Cost: performance, FFI, and a TCB that now includes the compiler/runtime. 161 wants you to name that tradeoff, not only "rewrite it in Rust" as a slogan.'),
  (14, 'memory-safety exam move',
       'Point at the write that is out of bounds, name what object is adjacent in the lecture diagram, and name a defense (canary, NX, ASLR, bounds check, safer API). Do not invent shellcode on a written exam unless they explicitly ask for a conceptual overlay.')
) AS c(pos, front, back)
WHERE d.slug = 'cs161'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 3. Mitigations, Isolation, Access Control
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'mitigations-os'
CROSS JOIN (VALUES
  (0,  'stack canary',
       'A secret value placed between locals and the saved return address. Before returning, the runtime checks it is unchanged. A straightforward smash that overwrites the return address also overwrites the canary (unless the attacker can learn it). Defense in depth, not a proof.'),
  (1,  'NX / W^X',
       'Memory is not both writable and executable. Injected bytes on the stack/heap should not run as code. This pushed attackers toward reusing existing executable code. 161: name the property (W xor X); do not treat it as "overflows are dead."'),
  (2,  'ASLR',
       'Address Space Layout Randomization: load the stack, heap, and libraries at unpredictable bases so hard-coded addresses fail. Entropy matters (32-bit ASLR is weaker). Information leaks that reveal addresses undermine it. Pair with PIE for the main binary.'),
  (3,  'PIE and RELRO (exam level)',
       'PIE: the executable itself is randomized, not only libc. RELRO: make the GOT harder to overwrite after startup. 161 may only want the slogan: reduce the number of easy, stable overwrite targets in the process image.'),
  (4,  'why mitigations compose',
       'A canary without NX still allows some stories; NX without ASLR still allows some stories. 161 exams like "which mitigation stops this specific lecture diagram?" If the attack never touches the canary, the canary does not help. Match mechanism to the step it blocks.'),
  (5,  'isolation: processes',
       'Separate virtual address spaces (61C VM week). A bug in process A should not write process B''s memory. The TCB is the kernel. Isolation is not confidentiality against a malicious kernel, and it is not a substitute for fixing overflows inside one process.'),
  (6,  'isolation: VMs and containers',
       'VMs: a hypervisor between guests; stronger isolation, heavier. Containers: shared kernel, namespace/cgroup isolation; weaker TCB (the host kernel). 161 Isolation lectures: pick the layer that matches the threat (untrusted tenant vs. untrusted function in your app).'),
  (7,  'privilege rings and user vs. kernel',
       'User code cannot run privileged instructions or touch kernel pages (61C protection bits). A kernel bug is a TCB failure. Least privilege: daemons should not run as root "because it was easier to bind port 80."'),
  (8,  'DAC vs. MAC',
       'Discretionary: owners pass access along (Unix rwx). Mandatory: a system policy the owner cannot override (SELinux types, MLS). Confused deputy: a privileged program is tricked into using its rights on the attacker''s behalf — capabilities are one design response.'),
  (9,  'ACLs vs. capabilities',
       'ACL: for each object, a list of (principal, rights). Capability: an unforgeable token that is the right. Unix fds are capability-like; file paths plus uid checks are ACL-like. Project 2 sharing can be designed either way — name the revocation story.'),
  (10, 'sandboxing',
       'Run untrusted code with reduced rights (seccomp, browser site isolation, JS in an origin). The sandbox is only as strong as the kernel/browser TCB and the policy. "We sandboxed it" is incomplete without what syscalls/origins remain.'),
  (11, 'SETUID and confused deputies',
       'A SETUID program runs as another user. If it opens a file named by the caller, it may write a file the caller could not. Defense: drop privilege, use capability-style fds, and never mix caller-controlled paths with raised privilege. Least privilege again.'),
  (12, 'complete mediation in the OS',
       'Every open/mmap/send must be checked. A check at start that is not repeated after a file is replaced is TOCTOU. 161 wants the name of the principle when a race lets a user swap a file under a privileged process.'),
  (13, 'antivirus / signatures (limits)',
       'Matching known malware hashes is not a memory-safety story and fails on new variants. Catalog "viruses and worms" belong with epidemiology and patching, not as a replacement for NX and least privilege.'),
  (14, 'isolation exam move',
       'Ask: does the attacker share an address space with the victim? If yes, you need memory safety or in-process mitigations. If no, you need a correct kernel/hypervisor and a policy. Mixing those answers is a common 161 mix-up.')
) AS c(pos, front, back)
WHERE d.slug = 'cs161'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 4. Symmetric Encryption
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'symmetric'
CROSS JOIN (VALUES
  (0,  'symmetric vs. public-key (preview)',
       'Symmetric: same secret key for encrypt and decrypt (AES). Public-key: encrypt with a public key, decrypt with a private key. Symmetric is fast; public-key is how you bootstrap a shared secret. Real systems hybridize (later lecture).'),
  (1,  'one-time pad',
       'XOR the message with a key that is uniformly random, as long as the message, and never reused. Perfect secrecy: ciphertext reveals nothing about the plaintext (Shannon). Reusing a pad is catastrophic. OTP is a teaching tool, not a file-encryption plan (key distribution).'),
  (2,  'perfect secrecy vs. computational security',
       'Perfect: even an unbounded attacker learns nothing. Computational: a realistic attacker cannot break it in feasible time (AES). 161 uses both languages. "Unbreakable" on an exam usually means you should specify which one.'),
  (3,  'Kerckhoffs again (crypto edition)',
       'AES is public. The key is the secret. Publishing the algorithm lets researchers attack it; hiding a weak homebrew does not make it AES. 161 will fail a design whose only secret is "we used a custom shuffle."'),
  (4,  'block ciphers and AES',
       'A block cipher is a keyed permutation on a fixed-size block (AES: 128-bit blocks). Security goal: it should look like a random permutation to anyone without the key. 161 does not ask you to implement the rounds; it asks you not to use AES as if it were a hash or a MAC.'),
  (5,  'ECB mode (do not use)',
       'Each block encrypted independently. Equal plaintext blocks produce equal ciphertext blocks (the "ECB penguin"). No IV. 161: ECB provides neither serious confidentiality for structured data nor integrity. Never recommend it.'),
  (6,  'CBC mode',
       'XOR each plaintext block with the previous ciphertext (or an IV for the first), then encrypt. Needs a random, unpredictable IV sent with the ciphertext. Malleable: flipping ciphertext bits flips plaintext bits in a patterned way — so CBC is not authenticated encryption.'),
  (7,  'CTR mode',
       'Encrypt a nonce+counter and XOR with plaintext (a keyed stream). Parallelizable. The nonce must never repeat with the same key. Like CBC, CTR alone is not integrity: XORing the ciphertext XORs the plaintext. Pair with a MAC or use AEAD.'),
  (8,  'IND-CPA (exam English)',
       'Indistinguishability under chosen-plaintext attack: the attacker can get encryptions of messages they pick and still cannot tell which of two equal-length messages you encrypted. ECB fails this. Randomized encryption (fresh IV) is required. 161 wants the slogan and a counterexample, not a reduction.'),
  (9,  'IV / nonce rules',
       'CBC: unpredictable IV. CTR/GCM: unique nonce per key. Reuse is a 161 midterm sin (OTP reuse family). IVs are not secret; they must not be constant. Send them in the clear next to the ciphertext.'),
  (10, 'padding and why errors are dangerous',
       'CBC needs padding to a block boundary. If decryption error messages distinguish "bad padding" from "bad MAC," that can leak plaintext over many queries (padding-oracle class). 161 moral: do not leak why decrypt failed; prefer AEAD so you do not invent padding schemes.'),
  (11, 'integrity is not free with encryption',
       'Confidentiality mechanisms (CBC, CTR) do not stop an attacker from modifying ciphertext. Recipients may decrypt garbage or attacker-controlled plaintext. You need a MAC or AEAD. "We encrypted it" is not an integrity answer.'),
  (12, 'key length (exam numbers)',
       'AES-128 is the 161 default "this is not brute-forceable." 256-bit keys are for extra margin or quantum talking points. A 40-bit key is a joke. Password-derived keys need a KDF with salt and work factor — a raw SHA of a password is not AES-strength.'),
  (13, 'PRP / PRF slogans',
       'Block cipher modeled as a pseudorandom permutation. A PRF is a keyed function that looks random. HMAC and CTR constructions are argued in that language in the notes. You will not prove tightness on a midterm; you will be asked which model a scheme assumes.'),
  (14, 'symmetric exam move',
       'Name the mode, the IV rule, and whether integrity is provided. If they ask for a scheme that hides repeating blocks, ECB is the wrong box. If they ask to detect tampering, AES-CBC alone is the wrong box.')
) AS c(pos, front, back)
WHERE d.slug = 'cs161'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 5. Hashes, MACs, Signatures, AE
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'integrity-ae'
CROSS JOIN (VALUES
  (0,  'cryptographic hash (three properties)',
       'Preimage resistance: hard to find x given H(x). Second-preimage: hard to find x'' != x with H(x'')=H(x) given x. Collision resistance: hard to find any distinct pair with the same hash. Collision resistance is the strongest of the three (and the first to fall in MD5/SHA-1).'),
  (1,  'hashes are not encryption',
       'H is public and unkeyed. You cannot "decrypt" a hash. Hashing a password without salt is still guessing-friendly. Hashing a message does not prove who sent it (anyone can hash). 161 mix-up: using SHA-256 where you needed a MAC or a KDF.'),
  (2,  'MD5 and SHA-1 are broken for collisions',
       'Do not use them for signatures, certs, or "unique IDs" an attacker might collide. SHA-256 / SHA-3 are the 161-era defaults. Length-extension: Merkle–Damgard hashes let you continue a hash if you know H(m) and the length — another reason not to build a MAC as H(key || msg).'),
  (3,  'MAC',
       'A message authentication code: keyed tag so the holder of the key can detect tampering and impersonation by outsiders. Provides integrity and authenticity given a shared key, not non-repudiation (both parties can forge tags). HMAC is the usual construction.'),
  (4,  'HMAC slogan',
       'HMAC(K, m) uses a hash with keys mixed in a standardized way so length-extension does not apply. Verify in constant time. 161: HMAC is not a hash of the key sitting in front of the message that you invented on the whiteboard.'),
  (5,  'encrypt-then-MAC (EtM)',
       'Encrypt, then MAC the ciphertext (and IV). Verify MAC before decrypting. This is the composition 161 wants if you build from parts. MAC-then-encrypt and encrypt-and-MAC have more failure modes. AEAD (GCM) packages this so you do not forget the order.'),
  (6,  'authenticated encryption / AEAD',
       'One API: confidentiality + integrity, optional associated data (headers) that is authenticated but not encrypted. AES-GCM and ChaCha20-Poly1305 are the modern defaults. Nonce uniqueness still matters. 161 Project 2: call AEAD, do not CBC+optional-hash.'),
  (7,  'replay',
       'A valid ciphertext/tag can be sent again. Encryption does not timestamp. Defenses: nonces that must be unique and checked, sequence numbers, or challenge-response. TLS records have this problem; the handshake and record layer address it. Name replay as its own threat.'),
  (8,  'digital signatures (vs MAC)',
       'Sign with a private key; anyone with the public key can verify. Provides authenticity and integrity with public verifiability (and, in the usual model, non-repudiation of the private-key holder). MACs need a shared secret; signatures scale to many verifiers (PKI, software updates).'),
  (9,  'certificates (preview of PKI)',
       'A certificate binds a public key to a name, signed by a CA. Trust is transitive through the CA set in your TCB (browser/OS roots). A signature on a file is only as meaningful as how you learned the public key. Next section: the full PKI mess.'),
  (10, 'password hashing is not SHA-256(password)',
       'Use a slow, salted KDF (Argon2, bcrypt, scrypt) so offline guessing is expensive. Unique salts stop rainbow tables. 161 passwords lecture: online guessing needs rate limits; offline guessing needs the KDF. Never store reversible "encrypted passwords" with a global key if you can hash.'),
  (11, 'collision attacks vs. preimage (exam)',
       'If the attacker can choose two documents that hash the same, you need collision resistance (certs, git if adversarial). If they try to invert a hash of a random secret, preimage is the property. MD5''s collision breaks are why we do not sign MD5.'),
  (12, 'constant-time comparison',
       'If your verify loop returns early on the first mismatch, timing can leak the MAC/password prefix. Use a constant-time compare from the crypto library. 161 will mention this next to MACs and password checks.'),
  (13, 'integrity without confidentiality',
       'You can MAC a public message (software update). You can encrypt without a MAC (usually a mistake). Match the property to the primitive. "Sign then encrypt" vs "encrypt then sign" is a protocol question — 161 wants you to pick a standard composition, not invent one.'),
  (14, 'integrity exam move',
       'Who holds which keys? If both endpoints share K, a MAC suffices. If verifiers should not be able to forge, you need signatures. If the channel is public, add AEAD or EtM. If they only hashed, they have neither authenticity nor confidentiality.')
) AS c(pos, front, back)
WHERE d.slug = 'cs161'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 6. Public-Key Crypto and DH
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'public-key'
CROSS JOIN (VALUES
  (0,  'public-key idea',
       'A key pair: public key publishable, private key secret. Encryption: anyone encrypts to you; only you decrypt. Signatures: only you sign; anyone verifies. Number theory (CS 70) supplies the hardness stories; 161 supplies the protocol mistakes around them.'),
  (1,  'Diffie-Hellman key exchange',
       'Agree on public g and p (or an elliptic curve). Alice sends g^a, Bob sends g^b, shared secret g^{ab}. Passive eavesdroppers who see the transcript should not compute the secret (CDH/DDH style assumptions). Unauthenticated DH is not safe against an active MITM.'),
  (2,  'MITM on unauthenticated DH',
       'An active attacker can sit in the middle, complete DH with Alice and with Bob separately, and translate. Defense: authenticate the DH (signatures, a pre-shared key, or a PKI). 161: "we used DH" is not "we authenticated the peer."'),
  (3,  'forward secrecy',
       'Ephemeral DH: generate a fresh DH key per session and forget the exponent. Compromise of a long-term signing key later should not decrypt old recorded sessions. Static RSA key-transport (old TLS) did not have this. Modern TLS prefers ECDHE.'),
  (4,  'hybrid encryption',
       'Use public-key (or DH) to establish a symmetric session key, then AEAD the bulk data. RSA of a 1 GB file is the wrong picture (size, speed, and "RSA is not a block cipher mode"). Project 2 file encryption is hybrid in spirit even if both users have passwords.'),
  (5,  'RSA encryption (161 level)',
       'Textbook RSA is not IND-CPA; real RSA encryption uses padding (OAEP) or, better, you do not encrypt messages directly — you encapsulate a symmetric key. 161: know that "just n, e, d" on a whiteboard is not a complete scheme.'),
  (6,  'RSA signatures (161 level)',
       'Sign a hash of the message with the private key (and a padding scheme like PSS). Verify with the public key. Never "sign the raw message" or "decrypt to sign" as a confused slogan. A signature on a hash is only as strong as the hash''s collision resistance.'),
  (7,  'PKI and CAs',
       'A certificate authority signs a binding (name, public key). Browsers trust a set of roots. Anyone who can get a CA to sign the wrong name can MITM TLS for that name. Certificate transparency and pinning are mitigations; the TCB still includes CAs.'),
  (8,  'what a cert actually claims',
       'Usually: the holder of this public key is the domain (or org) named here, as of this validity period, under this CA''s policy. It does not mean the website is honest, malware-free, or that the path to it is the only path. Scope your trust.'),
  (9,  'TOFU vs. PKI',
       'Trust on first use (SSH): remember the key you saw; later mismatches warn. PKI: a third party vouches. Signal-style safety numbers are TOFU-ish with an out-of-band check. 161 wants you to name the first-use risk vs. the CA risk.'),
  (10, 'authenticated encryption of keys in Project 2',
       'A secure file-sharing design stores ciphertexts the server cannot read, and uses MACs/signatures so the server cannot silently swap files. Sharing is a key-distribution + ACL problem. Revocation and integrity of the directory are the hard parts — not "AES exists."'),
  (11, 'public-key encryption vs signatures (do not swap)',
       'Encrypting with a private key is not a signature scheme (and is not how RSA-the-trapdoor should be used). Signing does not hide the message. 161 will give a protocol that used the wrong primitive and ask which property died.'),
  (12, 'key sizes (slogan)',
       'Symmetric 128-bit vs RSA 2048-bit vs 256-bit elliptic curves are "same ballpark" computational security in 161 talk, not a conversion formula you must derive. Short RSA (512) is homework history, not a product choice.'),
  (13, 'randomness',
       'Keygen, IVs, DH exponents, and padding all need a CSPRNG. A bad PRNG is a 161 case-study genre (Debian OpenSSL). If the exam says "the RNG is public and repeating," every scheme that needed freshness dies.'),
  (14, 'public-key exam move',
       'Who knows the private key? What is authenticated (names? the DH transcript?)? Is the session ephemeral? If a server stores files, can it read them or only store blobs? Draw the arrows before you name AES.')
) AS c(pos, front, back)
WHERE d.slug = 'cs161'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 7. Networks, TLS, End-to-End
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'networks-tls'
CROSS JOIN (VALUES
  (0,  'on-path vs. off-path vs. in-browser',
       'On-path: sees and can modify packets (evil Wi-Fi, compromised router). Off-path: can send spoofed packets but does not see replies (harder TCP injection). In-browser: JS on a page, cookies, SOP. 161 low-level network lectures: say which attacker you mean.'),
  (1,  'IP does not authenticate the source',
       'The source address field is not a credential. Spoofing is a thing. Higher layers (TLS, application passwords) exist because the network is a dump truck, not a trusted courier. Firewalls may still filter obviously bogus ranges; that is policy, not magic.'),
  (2,  'TCP in one security sentence',
       'Reliable byte stream with ports and sequence numbers. Sequence numbers that are guessable make off-path injection easier; modern stacks randomize. RST and session hijack stories are "integrity of the bytestream without crypto." TLS sits above this.'),
  (3,  'UDP',
       'No handshake, no built-in congestion or ordering. DNS historically used UDP. Spoofing and amplification (small request, large response to a victim address) are availability attacks. Defense at the protocol: authenticate, rate-limit, avoid open amplifiers.'),
  (4,  'BGP (idea)',
       'Autonomous systems advertise routes. A bad advertisement can hijack traffic (wrong-path, or to an attacker). Origin validation (RPKI) helps but is incomplete. 161: routing is a trust and incentive problem, not AES''s job.'),
  (5,  'DNS (idea)',
       'Names to IP addresses, a tree of nameservers, caching resolvers. Traditional DNS is unauthenticated and often unencrypted (on-path can lie or snoop). DNSSEC authenticates data with signatures; DoT/DoH encrypt the stub-to-resolver hop. Different properties.'),
  (6,  'TLS goals',
       'A TLS session should give you a confidential, integrity-protected channel to a server authenticated by a certificate (or a pre-shared key). It does not make the server application honest. HTTPS is HTTP over TLS. Certificate validity is PKI, not "the lock means safe site."'),
  (7,  'TLS handshake (161 sketch)',
       'Agree on versions/ciphers, authenticate the server (and optionally the client), run DH for a session key, then AEAD the records. Finished messages bind the transcript. Downgrade attacks try to force an old, weak mode — another reason to kill ancient ciphers.'),
  (8,  'end-to-end vs. hop-by-hop',
       'Hop-by-hop: each link encrypted (Wi-Fi WPA, or TLS to a proxy). End-to-end: only the true endpoints have the keys (Signal). A TLS connection to a load balancer that then talks HTTP internally is not E2E to the app process. Name the endpoints.'),
  (9,  'what crypto does not solve',
       'Bugs in the endpoint, phishing, malicious apps, coerced users, metadata (who talked to whom), and availability. Lecture "What Crypto Doesn''t Solve" is 161 telling you not to stop at AEAD. Threat-model the human and the implementation.'),
  (10, 'network defense (catalog)',
       'Firewalls: allow/deny by address, port, state. Useful, bypassable, not a substitute for patching. IDS/IPS: pattern matching, false positives. Segmentation: a breached host should not see the crown jewels (least privilege for networks).'),
  (11, 'worms vs. targeted exploits (catalog)',
       'A worm spreads itself; a targeted attack may not. Availability and integrity of many hosts vs. one high-value victim. Patching and least privilege still dominate; "a firewall" is not a worm vaccine by itself.'),
  (12, 'HTTP vs HTTPS cookies (preview)',
       'A Secure cookie should not be sent on HTTP. Without TLS, cookies are on-path readable and writable. 161 web week assumes you remember that the network attacker is why HTTPS is the default.'),
  (13, 'DoS as availability',
       'Floods, amplification, and algorithmic complexity can knock a service over without "breaking AES." Defenses: capacity, anycast, rate limits, not solving puzzles in the application as your only plan. CIA: this is the A.'),
  (14, 'network exam move',
       'Can the attacker see the bytes? Modify them? Only inject? Then pick the property (authenticity of IP, integrity of TCP, secrecy of DNS queries) and the mechanism (TLS, DNSSEC, filtering). "Use a VPN" is a hop-by-hop answer — say to where.')
) AS c(pos, front, back)
WHERE d.slug = 'cs161'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 8. Web basics, cookies, SOP
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'web-basics'
CROSS JOIN (VALUES
  (0,  'origin (SOP)',
       'An origin is scheme + host + port (https, example.com, 443). Same-origin policy: JS from origin A should not read origin B''s DOM or cookies. It is the browser''s main isolation primitive. Subdomains and http vs https are different origins (usually).'),
  (1,  'cookies',
       'Name/value pairs the browser stores and sends on later requests to a matching domain/path. Set by Set-Cookie. They are the usual session mechanism. Flags matter: Secure, HttpOnly, SameSite, Domain, Path. A cookie is not "encryption"; it is a bearer token if stolen.'),
  (2,  'Secure and HttpOnly',
       'Secure: only send on HTTPS. HttpOnly: JS cannot read the cookie (reduces theft via XSS, does not stop the browser from sending it). Neither flag by itself stops CSRF (the browser still attaches cookies to requests). Stack them with SameSite and a CSRF token.'),
  (3,  'SameSite cookies',
       'Strict/Lax/None: whether the cookie rides on cross-site requests. Lax default in modern browsers blocks many CSRF cases on POST from other sites, not every GET-based CSRF, and not same-site subdomain issues. Still combine with server-side CSRF tokens for defense in depth.'),
  (4,  'sessions vs. putting the whole user in a cookie',
       'Server-side session: cookie is a random ID; state lives on the server. Signed client-side cookie: state in the cookie, MAC so the client cannot rewrite it. If you store a "role=admin" flag without a MAC, the client will edit it. Project 3 teaching sites love this class of bug.'),
  (5,  'passwords on the web',
       'Send over TLS. Store salted slow hashes. Rate-limit guesses. Offer 2FA. Reset flows are authentication protocols (email is a weak factor). 161: the reset link is a capability; leak it and you leak the account.'),
  (6,  'phishing vs. crypto failure',
       'A perfect TLS session to the attacker''s site still authenticates the wrong peer from the user''s point of view. UI security (URL bar, U2F/passkeys) is how you bind "who the human meant." Crypto did its job; the threat model included a gullible click.'),
  (7,  'CORS (slogan)',
       'Cross-Origin Resource Sharing: a way for origin B to opt into letting origin A''s JS read B''s responses. Default is deny (SOP). Misconfigured Access-Control-Allow-Origin: * plus credentials is a 161 "please do not" slide. CORS is not a substitute for CSRF tokens on cookie-auth state changes.'),
  (8,  'third-party cookies and tracking (light)',
       'Browsers are restricting third-party cookies. Security angle: a third-party script on your page runs as your origin if you include it (TCB!), while a third-party iframe is a different origin. Mixing these up loses exam points.'),
  (9,  'HTTPS mixed content',
       'An HTTPS page that loads an HTTP script is no longer a TLS story for that code. Browsers block or warn. 161: the lock icon is about the page''s origin, not every pixel and not the server''s application logic.'),
  (10, 'authentication cookies are bearer tokens',
       'Anyone who can make the browser send the cookie, or who steals it, is the user. XSS steals (unless HttpOnly). Network theft needs TLS. CSRF uses the browser as a deputy to send the cookie. Three different theft/use stories, three defenses.'),
  (11, 'login CSRF / session fixation (idea)',
       'Forcing a victim into the attacker''s session or logging the victim into the attacker''s account can be a policy bug even with "HTTPS everywhere." Bind sessions to creation context; regenerate session IDs at login. 161 web auth lecture: sessions have a lifecycle.'),
  (12, 'UI: clickjacking (idea)',
       'Overlay or frame a page so the user clicks a hidden control. Defense: Do not frame sensitive pages (CSP frame-ancestors / X-Frame-Options). This is UI security week, not a crypto fail.'),
  (13, 'why SOP is not "the server is safe"',
       'SOP constrains the browser. The server must still check authorization on every request (complete mediation). A hidden URL is not an access-control mechanism. Project 3: the teaching app''s bugs are usually missing checks plus injection, not a broken AES.'),
  (14, 'web-basics exam move',
       'Draw origins as boxes. Ask whether JS can read a value, whether the browser will attach a cookie, and whether the server will believe the request. Those three questions separate SOP, CSRF, and stolen cookies.')
) AS c(pos, front, back)
WHERE d.slug = 'cs161'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 9. SQLi, XSS, CSRF (conceptual / defensive)
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'web-attacks'
CROSS JOIN (VALUES
  (0,  'injection, generally',
       'Untrusted data is parsed as code in another language (SQL, HTML/JS, shell). The defense is to keep data out of the control channel: parameterized APIs, encoding for the right context, or a memory-safe templating engine. 161 treats SQLi, XSS, and command injection as one family.'),
  (1,  'SQL injection (what it is)',
       'Building a query by concatenating user strings lets those strings change the query''s structure (read extra rows, skip auth, sometimes change data). This deck will not give query payloads. If you can put user text inside quotes you opened, you are in the danger zone.'),
  (2,  'SQL injection (how you prevent it)',
       'Parameterized queries / prepared statements: SQL structure is fixed; user values are bound as data. Object-relational layers still need care (raw fragments). Least-privilege DB users so a SELECT-only account cannot DROP. Validate types as defense in depth, not as the only control.'),
  (3,  'XSS (what it is)',
       'Cross-site scripting: attacker-controlled content is interpreted as script in another user''s origin, so it inherits that origin''s rights (DOM, cookies unless HttpOnly, actions as the user). Stored: saved on the server. Reflected: bounced off a request. DOM-based: client-side sink. No payloads here.'),
  (4,  'XSS (how you prevent it)',
       'Encode/escape for the context you are writing into (HTML text vs. attribute vs. URL vs. JS). Prefer templating that encodes by default. Content-Security-Policy to reduce inline script. Treat every stored string as untrusted even if "only admins type here."'),
  (5,  'why HttpOnly is incomplete against XSS',
       'The script may not read the cookie but can still perform actions in the victim''s session (forge requests from that origin). XSS is often a full account takeover of the web app, not only a cookie-export bug. CSP and encoding are still required.'),
  (6,  'CSRF (what it is)',
       'Cross-site request forgery: a victim''s browser, already logged in, is made to send a state-changing request to a target site; the cookie goes along. The attacker does not steal the cookie; they use the browser as a confused deputy. SOP does not block the send; it blocks reading the response.'),
  (7,  'CSRF (how you prevent it)',
       'Unpredictable CSRF tokens bound to the session and checked on POST. SameSite cookies. Requiring a custom header that only same-origin JS can set (with care). SameSite is not a complete story for all GET side effects — do not put state changes on GET.'),
  (8,  'why CSRF tokens are not XSS defenses',
       'An XSS attacker runs in the origin and can read the token from the page. Different bug, different control. 161 loves a design that "added a CSRF token" and still has a stored XSS. Name both.'),
  (9,  'output encoding vs. input sanitization',
       'Encoding at the output boundary for a known context is the reliable XSS control. "Strip angle brackets on input" fails the next context (attributes, JSON, URLs) and breaks legitimate text. For SQL, parameterization beats filter lists. 161: filters as only defense are a red flag.'),
  (10, 'authorization bugs (IDOR)',
       'Changing an id in a URL or JSON to see another user''s object. Complete mediation: check every access against the session''s principal. Hidden URLs and "security by obscurity" are not mechanisms. Project 3 teaching apps often combine this with injection.'),
  (11, 'CSP (Content-Security-Policy)',
       'A header that tells the browser which script sources may run, whether inline is allowed, who may frame you, etc. Defense in depth for XSS, not a license to skip encoding. A policy with unsafe-inline and wildcards is a slogan without teeth.'),
  (12, 'UI redress / clickjacking (again)',
       'Framing and overlays trick a user into confirming a dangerous action. frame-ancestors / X-Frame-Options. Combine with CSRF tokens because a click can still be a real, cookie-authenticated request.'),
  (13, 'Project 3 (what it is testing)',
       'A deliberately vulnerable web app. The learning goal is to map a page to a bug class (injection, CSRF, XSS, IDOR) and name the correct defense. Staff provide the instance. This deck stays at the class-and-defense level.'),
  (14, 'web-attack exam move',
       'Is the attacker''s data executed as SQL, as HTML/JS, or only sent as a cross-site request with cookies? Those map to SQLi, XSS, and CSRF. Then write the matching defense (parameters, encoding+CSP, token+SameSite), not "sanitize" as a one-word plan.')
) AS c(pos, front, back)
WHERE d.slug = 'cs161'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 10. AI security and case studies
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'cases-ai'
CROSS JOIN (VALUES
  (0,  'AI security: prompt injection (idea)',
       'Untrusted text (a web page, an email, a tool result) is mixed into an LLM''s instructions so the model follows the attacker''s goals instead of the developer''s. It is confused-deputy / injection again: one channel, two languages (system policy vs. data). Treat model output as untrusted before it can call tools.'),
  (1,  'AI security: data poisoning and supply chain',
       'Training or fine-tuning data can embed behavior you did not intend. Model weights and datasets are a TCB. 161 angle: the same "do not blindly trust inputs" principle, now at dataset scale. Provenance and least privilege for tool plugins matter more than a new cipher.'),
  (2,  'AI security: secrets in the context window',
       'Anything in the prompt, retrieval corpus, or tool traces may be emitted later. Do not put raw API keys in the context. Isolation: the model that talks to the user should not be the process that holds production credentials — confused deputy again.'),
  (3,  'Signal case study (properties)',
       'End-to-end messaging: the service operator should not read plaintext. Forward secrecy via ratcheting; identity keys authenticated out of band (safety numbers). Sealed sender and metadata protection are extra goals — crypto still does not stop a compromised endpoint or a screenshot.'),
  (4,  'iPhone case study (properties)',
       'Secure Enclave, hardware-bound keys, file encryption tied to lock state, sandboxing, signed code. Threat models differ: lost-device thief vs. nation-state vs. malicious app. 161: name which attacker the Secure Enclave is for (not "the phone is unhackable").'),
  (5,  'passwords, online vs. offline',
       'Online: the server can rate-limit and lock out. Offline: the attacker has the hash file and can guess at GPU speed — hence slow salted KDFs. Credential stuffing uses leaked passwords elsewhere; unique passwords and a manager (or passkeys) are the human-scale defense.'),
  (6,  '2FA / passkeys (slogan)',
       'A second factor (TOTP, hardware token, platform passkey) raises the cost of a stolen password. Phishing-resistant authenticators bind to the origin (WebAuthn). SMS 2FA is better than nothing and weaker than a token. Reset flows remain the soft underbelly.'),
  (7,  'Project 2 design checklist',
       'Threat model the server (honest-but-curious vs. malicious). Confidentiality of file bytes, integrity of file contents and of sharing metadata, authentication of users, revocation, and sharing with the right principal. Use AEAD and a real KDF. Write the protocol before the Go.'),
  (8,  'malware vs. memory safety vs. web (closing map)',
       'Same course, three layers: unsafe C, network that lies, web that mixes code and data. Defenses rhyme: isolate, check every access, keep data out of control channels, authenticate the channel, shrink the TCB. That is the catalog in one paragraph.'),
  (9,  'viruses and worms (catalog, short)',
       'Self-replicating code riding users or remote bugs. Worms historically scanned and spread without a click. Defense: patch, least privilege, segmentation, not a single signature pack. 161 spends more time on the bug classes that let them in.'),
  (10, 'privacy vs. security',
       'Security: against a threat model. Privacy: limits on what even the "legitimate" system learns (metadata, tracking). E2E chat is both. A TLS VPN to a logging proxy can be security without privacy from that proxy. Say who you are hiding from.'),
  (11, 'case-study method',
       'Who is the adversary? What is the TCB? Which CIA properties are claimed? What mechanism provides each? Where did the real incident fail (policy, implementation, UX)? Wagner/Kao exams reuse this outline on Signal, iPhones, and whatever is in the news.'),
  (12, 'AI + web (why 161 added this)',
       'Agents that browse and click are confused deputies with XSS/CSRF-shaped failures. Tool-calling models need the same complete mediation as a web session. Fa26''s AI week is not a different field; it is 161 principles on a new TCB.'),
  (13, 'ethics and scope (161 culture)',
       'The projects are authorized teaching systems. The same techniques against systems you do not own are crimes. 161''s point is to build and defend, and to recognize bug classes — not to provide a cookbook for attacking the open internet.'),
  (14, '161 closing picture',
       'Write a threat model. Pick properties. Map each to a mechanism (process isolation, AEAD, TLS, parameterized SQL, SOP+CSP, PKI). Assume the attacker reads the notes. Then ship tests. That is Computer Security at Berkeley.')
) AS c(pos, front, back)
WHERE d.slug = 'cs161'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

UPDATE public.decks
SET    card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE  slug = 'cs161';
