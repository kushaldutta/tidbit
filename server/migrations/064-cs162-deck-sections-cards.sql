-- Migration 064: CS 162 — Operating Systems and System Programming, new deck.
-- UC Berkeley Fall 2026: John Kubiatowicz (campus listing also Luca Manolache),
-- TuTh 14:00-15:29, Gateway 1220. cs162.org.
-- Catalog: processes, IPC, synchronization; memory (segmentation, paging);
-- loading/linking; scheduling; file systems, storage, I/O; protection.
-- Prereq: CS 61B, CS 61C, CS 70.
-- Text: Anderson & Dahlin, Operating Systems: Principles and Practice (2e).
-- Projects: Pintos (user programs, threads, file systems). Sequence follows
-- the Fall 2026 lecture calendar.

INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES (
  NULL,
  'cs162',
  'CS 162',
  'Operating Systems — Kubiatowicz / A&D: threads, sync, VM, files, distributed',
  'uc-berkeley:cs162:fa26',
  'system',
  true,
  '🖥️',
  0
)
ON CONFLICT (slug) DO UPDATE SET
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  class_id    = EXCLUDED.class_id,
  cover_emoji = EXCLUDED.cover_emoji;

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'cs162');

DELETE FROM public.tidbits
WHERE category_id = 'cs162';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'cs162');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'cs162');

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('os-fundamentals',   'What Is an OS?',
   'Kernel vs user, dual mode, four fundamental concepts (A&D 1–2)', 0),
  ('threads-processes', 'Threads & Processes',
   'TCB, PCB, fork/exec/wait, user vs kernel threads (A&D 3–4)', 1),
  ('files-ipc',         'Files, Sockets & IPC',
   'File descriptors, pipes, sockets, shared memory', 2),
  ('sync-locks',        'Locks & Mutual Exclusion',
   'Races, critical sections, atomics, spinlocks, futex', 3),
  ('sync-higher',       'Semaphores, Monitors & R/W',
   'Sleeping locks, Mesa vs Hoare, readers/writers', 4),
  ('scheduling',        'Scheduling & Deadlock',
   'FCFS, RR, priority, CFS-style share, deadlock, inversion', 5),
  ('virtual-memory',    'Address Translation',
   'VA vs PA, segments, page tables, multi-level (A&D 8–9)', 6),
  ('paging',            'TLBs & Demand Paging',
   'TLB, page faults, replacement, thrashing (A&D 10, 12)', 7),
  ('io-filesystems',    'I/O, Devices & File Systems',
   'Drivers, disks, inodes, directories, buffer cache', 8),
  ('distributed',       'Reliability & Distributed Systems',
   'Transactions, 2PC, RPC, MapReduce, Raft (A&D end)', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'cs162'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. What Is an OS?
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'os-fundamentals'
CROSS JOIN (VALUES
  (0,  'CS 162 (Kubiatowicz) in one sentence',
       'How a kernel multiplexes hardware among programs: threads, address spaces, files, and dual-mode protection — then scheduling, virtual memory, disks, and a taste of distributed systems. Pintos is the lab OS. Textbook: Anderson & Dahlin (A&D).'),
  (1,  'what an OS is for',
       'Referee (isolation, fair sharing), illusionist (infinite memory, many CPUs, files that look like bytes), and glue (standard APIs so programs compose). If you only remember "it runs programs," you missed isolation and the illusions.'),
  (2,  'kernel vs. user mode',
       'User mode cannot execute privileged instructions or touch kernel memory (61C rings). Syscalls are the controlled door: trap, save user state, run kernel, restore. Dual-mode operation is why a crashy app should not take down the machine.'),
  (3,  'the four fundamental OS concepts (A&D)',
       'Thread (a sequential execution context), address space (the memory the thread may touch), file (persistent named bytes — later generalized to any I/O), and dual-mode / kernel (the trusted referee). 162 lectures 1–2 hang every later topic on these four.'),
  (4,  'syscall vs. procedure call',
       'A procedure call stays in one address space and privilege. A syscall crosses into the kernel: trap, argument validation, copyin/copyout, possible sleep. Cost is hundreds to thousands of cycles — which is why you batch I/O and why getpid is still not free.'),
  (5,  'interrupt vs. exception vs. syscall',
       'Interrupt: device or timer, asynchronous to the current instruction. Exception/fault: the running instruction (page fault, divide-by-zero). Syscall: a deliberate trap. All three enter the kernel; they differ in why and whether they restart the same instruction.'),
  (6,  'privileged instructions (examples)',
       'Load page-table base, enable/disable interrupts, halt, I/O port access, return-from-trap. User code that tries them traps. 61C SATP/protection bits are the hardware; 162 is the software policy on top.'),
  (7,  'the kernel as a TCB',
       'Everything in kernel mode is trusted for isolation. A kernel bug is a 161-style TCB failure. 162 design: keep the kernel small-ish, check syscall args, never trust user pointers. Microkernels push more to user space; Pintos is a simple monolithic teaching kernel.'),
  (8,  'mechanism vs. policy (OS edition)',
       'Mechanism: how to switch threads, map a page, enqueue a disk request. Policy: which thread runs, which page to evict, which request first. 162 wants you to keep them separable so you can change the scheduler without rewriting context switch.'),
  (9,  'uniprogramming vs. multiprogramming',
       'One program owns the machine vs. several in memory, overlapping I/O wait of one with CPU of another. Utilization is why we have processes. Concurrency (and races) is the tax. Throughput can go up even if each job is a bit slower.'),
  (10, 'protection vs. security (catalog)',
       'Protection: the hardware+kernel mechanisms (address spaces, dual mode). Security/privacy: the policy and the leftover holes (confused deputy, covert channels). 162 covers protection deeply; full 161 is the adversarial course. You still must validate syscall arguments.'),
  (11, 'Pintos in one paragraph',
       'A tiny OS for x86 you extend: threads, user programs (args, syscalls), then a file system. Project 0 is a warmup (you already "fixed" something). Later projects need a design doc, not just autograder green. Kubiatowicz: if you cannot explain the design, the code will lie to you.'),
  (12, 'boot and the first process',
       'Firmware loads a bootloader, which loads the kernel, which initializes devices and starts a first user process (init / Pintos first thread). There is no "OS already running" underneath the kernel. 162 cares that user programs start with an empty address space you build.'),
  (13, 'library vs. kernel',
       'libc malloc, printf, and pthreads (sometimes) are user-level. open, mmap, fork are syscalls. Linking (catalog) pulls libraries into your address space; they still cannot bypass protection. "The C library is the OS" is a 162 fail.'),
  (14, '162 exam habit',
       'Name the abstraction (thread, address space, file), whether you are in user or kernel, and which resource is multiplexed. "The OS handles it" without a mechanism is not full credit. Draw the stack of a thread that just took a syscall.')
) AS c(pos, front, back)
WHERE d.slug = 'cs162'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 2. Threads & Processes
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'threads-processes'
CROSS JOIN (VALUES
  (0,  'thread vs. process',
       'A thread is a sequential execution (registers, stack, PC). A process is an address space plus one or more threads, plus OS handles (fds). Threads in a process share the heap and fds; they do not share stacks. 162: isolation is at the process/address-space boundary unless you add more.'),
  (1,  'TCB (thread control block)',
       'Kernel (or user runtime) record: saved registers, stack pointer, state (ready/running/blocked), scheduling info. Context switch saves this TCB and loads another. If you forget to save a callee-saved register, user programs mysteriously corrupt.'),
  (2,  'PCB (process control block)',
       'Kernel record for a process: address-space pointer (page table), list of threads, open file table, pid, parent, credentials. fork copies a lot of this; exec replaces the address space but can keep fds (unless CLOEXEC).'),
  (3,  'user-level vs. kernel threads',
       'User-level: cheap switch, kernel sees one thread — a blocking syscall blocks all. Kernel threads: each can block independently, switch is a syscall/trap. Hybrid (M:N) exists; 162 wants the blocking tradeoff, not a slogan for green threads.'),
  (4,  'fork',
       'Unix: duplicate the process. Child gets a copy of the address space (usually copy-on-write), fds, and a new pid; fork returns 0 in the child and the child pid in the parent. Shared mutable state is a bug factory. 162 + Pintos userprog: you implement a cousin of this world (wait, exec).'),
  (5,  'exec',
       'Replace the current address space with a new program; keep pid and (usually) fds. Arguments and environment become the new argv/envp. After exec, the old stacks and heap are gone. fork+exec is how shells start commands; a raw fork without exec just clones you.'),
  (6,  'wait / exit and zombies',
       'exit records a status and becomes a zombie until the parent wait()s (or the child is reparented to init). If the parent never waits, zombies accumulate. If the parent waits on the wrong pid, you deadlock your shell. Project 1: wait must be correct under races.'),
  (7,  'ready, running, blocked',
       'Running: on a CPU. Ready: could run if scheduled. Blocked: waiting for I/O, a lock, a child, a page. A blocked thread is not "using the CPU slowly"; it is off the run queue. Mixing blocked and ready on an exam loses the scheduler question.'),
  (8,  'context switch (what is saved)',
       'Save user/kernel registers of the outgoing thread, switch kernel stacks, load the incoming thread, restore page table if the process changed, return-from-trap into its PC. Voluntary (yield, sleep) vs. involuntary (timer interrupt). Pintos switch_threads is this picture.'),
  (9,  'kernel stack per thread',
       'Each kernel thread (or each kernel-supported thread) has a kernel stack for syscall/interrupt frames. You cannot use the user stack while in the kernel (the user can smash it). Overflowing the kernel stack is a kernel panic. Pintos: small kernel stacks, be stingy with locals.'),
  (10, 'copy-on-write (fork)',
       'Parent and child share physical pages marked read-only; a write faults, then the kernel copies. Saves memory and fork time. 162 memory lectures make this precise; here know why fork is not "always memcpy the whole RAM."'),
  (11, 'thread creation (pthread vs. clone)',
       'pthread_create: new thread, same address space. clone/fork: more knobs (Linux). Shared heaps mean races unless you synchronize. 162 Project 2 is kernel threads in Pintos, not pthreads, but the race stories transfer.'),
  (12, 'why stacks cannot be shared',
       'Each thread''s locals and return addresses live on its stack. Sharing one stack is undefined (they would clobber frames). The heap is shared on purpose. If two threads call into a non-reentrant function with static buffers, you have a bug even with separate stacks.'),
  (13, 'Pintos user programs (Project 1)',
       'Load an ELF, set up a user stack with argv, implement syscalls (halt, exec, wait, read, write, ...), and reject bad user pointers. Argument passing (word-align, argv array) is the classic 162 rite. Design doc first: who owns the file-descriptor table.'),
  (14, 'threads exam move',
       'Does this state live in the TCB, the PCB, or the user stack? After fork, what is shared vs. copied? If a thread blocks in the kernel, which stacks still exist? Draw it before you write code.')
) AS c(pos, front, back)
WHERE d.slug = 'cs162'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 3. Files, Sockets & IPC
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'files-ipc'
CROSS JOIN (VALUES
  (0,  'everything is a file (Unix slogan)',
       'A file descriptor is an int indexing the process''s open-file table: regular files, pipes, sockets, devices. read/write/close work across them. The slogan is an API, not a claim that a socket is an inode on disk. 162: name the table (fd → file object → vnode/inode).'),
  (1,  'open file table vs. inode',
       'Per-process fd table points at a system-wide open-file object (offset, flags) which points at the inode/vnode. dup and fork share the offset; two opens of the same path do not. Midterm classic: after fork, a write in the child moves the parent''s offset too if they share the open-file object.'),
  (2,  'pipes',
       'A bounded kernel buffer with a read end and a write end. Writes block when full; reads block when empty (unless closed). Closing the write end makes readers see EOF. A pipe is IPC for related processes (usually after fork). No network, no names (unless FIFO).'),
  (3,  'sockets (162 level)',
       'A file-descriptor API for networking: socket, bind, listen, accept, connect, then read/write. TCP is a byte stream; UDP is datagrams. Layering: your app talks POSIX, the kernel talks IP. Homework HTTP is this plus a tiny parser — check your reads for short counts.'),
  (4,  'IPC menu',
       'Pipes, sockets, shared memory + sync, signals, files. Shared memory is fast and racy. Messages (pipes/sockets) copy and serialize. Pick by whether you need a boundary (messages) or a big array (shm). 162 will ask which one provides isolation.'),
  (5,  'signals (light)',
       'Asynchronous software interrupts to a process (INT, TERM, CHLD, SEGV). Handlers run on the user stack (or an alt stack). Async-signal-safe functions only. Not a general RPC. SIGCHLD is how you notice a child exited if you are not blocked in wait.'),
  (6,  'stdin/stdout/stderr',
       'Fds 0, 1, 2 by convention. A shell dup2s a pipe onto 1 before exec. If you forget to close unused pipe ends, EOF never happens and pipelines hang. HW2 shell: this is the whole point.'),
  (7,  'blocking vs. non-blocking I/O',
       'Blocking: the thread sleeps until the device/socket is ready (leaves the CPU). Non-blocking: return EAGAIN and let the event loop continue. select/poll/epoll wait for many fds. 162 I/O week: overlap is how multiprogramming got its utilization.'),
  (8,  'memory-mapped files (mmap)',
       'Map file bytes into the address space; paging does the I/O. Shared maps are another IPC. Private maps are copy-on-write. mmap is why "files vs. memory" is blurry — demand paging unifies them. HW4 memory will make you feel this.'),
  (9,  'absolute vs. relative paths, cwd',
       'The process has a current directory. Paths are translated by the file system (later lectures: directories are files of names → inodes). Chroot/jails are policy on that walk. 162: pathname walk is not free and it takes locks.'),
  (10, 'short reads and short writes',
       'read may return fewer bytes than requested (signals, sockets, pipes). A correct HTTP server loops. Assuming one read = one request is a 162 homework bug. write can be short too; loop until done or error.'),
  (11, 'close and resource leaks',
       'Fds are a finite table. Forgetting close in a server leaks until EMFILE. After fork, both sides must close the ends they do not need. Pintos: a process exit must close remaining fds or the FS layer leaks.'),
  (12, 'shared memory without a protocol',
       'Two processes mapping the same pages still need locks or you have data races (the next two weeks). mmap of a file is not a mutex. 162: IPC that shares memory is the fast path and the bug path.'),
  (13, 'why the kernel copies',
       'User pointers are untrusted (161/162). copyin/copyout into kernel buffers, then I/O. Zero-copy tricks exist later (sendfile). For Pintos, if you dereference a user pointer in kernel mode without checking, you lose — and you might panic the kernel.'),
  (14, 'IPC exam move',
       'Is the channel bytes or messages? Shared offset or not? Does it work after exec? Who blocks? Pipe vs. socket vs. mmap is three different answers to those questions.')
) AS c(pos, front, back)
WHERE d.slug = 'cs162'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 4. Locks & Mutual Exclusion
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'sync-locks'
CROSS JOIN (VALUES
  (0,  'race condition',
       'Outcome depends on interleaving. Shared mutable state + concurrent threads + no synchronization. 162 wants an example: two threads do load-add-store on a counter and lose an increment. Fix the critical section, do not "run it on one core and hope."'),
  (1,  'critical section and mutual exclusion',
       'A critical section is code that must run as if atomic w.r.t. other threads'' critical sections on the same data. Mutual exclusion: at most one thread in the CS. Safety is "no two at once"; liveness is "someone gets to enter." Both are required.'),
  (2,  'atomic instructions',
       'Test-and-set, compare-and-swap, fetch-and-add: the CPU does a read-modify-write that other CPUs cannot interleave. Locks are built from these (and from disabling interrupts on a uniprocessor). C compilers can tear ordinary loads/stores; volatile is not a lock.'),
  (3,  'spinlocks',
       'Busy-wait until the lock is free. Fine for short CS on multiprocessors if you cannot sleep. Waste CPU if the holder is preempted. Never spin in a CS that might block. Pintos: spinlocks vs. semaphores is a design-doc question.'),
  (4,  'disabling interrupts (uniprocessor locks)',
       'On one CPU, no concurrent thread runs if interrupts are off (no timer preemption). Does not work across CPUs. Too long with interrupts off and devices starve. Kernel often: disable interrupts AND take a spinlock on SMP (linux irqsave style — 162 wants the idea).'),
  (5,  'too much vs. too little locking',
       'Too little: races. Too much: deadlock, convoy, lost parallelism. Hold locks only over the shared data, in a consistent order, for a short time. 162 Project 2 will punish both a data race and a lock that covers a blocking I/O.'),
  (6,  'memory visibility / ordering (exam level)',
       'On modern CPUs, a store in thread A is not automatically visible to B without a barrier or lock. Locks include the barriers. "I set the flag then the data" without synchronization can appear reversed. 162 mentions this; CS 61C atomics are the hardware story.'),
  (7,  'futex (Linux slogan)',
       'Fast userspace mutex: uncontended lock is atomic ops in user space; contention waits in the kernel. Pintos will not implement futex, but Kubiatowicz wants you to know why every lock should not be a syscall.'),
  (8,  'lock implementation bugs',
       'Forgetting to restore interrupts. Busy-waiting with interrupts off (dead machine). Using a spinlock then sleeping (priority inversion / deadlock). Double-unlock. 162 exams: walk the acquire/release on two CPUs with a test-and-set.'),
  (9,  'Peterson/Dekker (historical)',
       'Software-only two-thread mutex with flags and a turn variable — assumes sequential consistency. Teaching tool; real systems use atomics. If the exam asks, name the turn variable''s job: break the tie when both want in.'),
  (10, 'reentrancy',
       'A lock that you already hold: recursive locks allow it (count); normal mutexes deadlock. Kernel code that takes a lock then calls a function that takes the same lock is a classic Pintos freeze. Document lock ranks.'),
  (11, 'wait queues',
       'Instead of spinning, a blocked thread is put on a list and the releaser wakes one (or all). Lost wakeup: wait without holding the lock that protects the condition. Mesa-style monitors later make this precise.'),
  (12, 'Pintos locks/semaphores',
       'You will implement sleep/wake correctly: disable interrupts around the check-and-sleep, or you lose the wakeup. The autograder injects context switches. If it only fails under -mlf, you have a race.'),
  (13, 'shared-state discipline',
       'Every shared variable has a lock (or is atomic/read-only after init). Write that in the design doc: "list->lock protects list->head." 162 graders look for this sentence. A lock named "big_lock" around the whole kernel is a policy failure.'),
  (14, 'sync exam move',
       'Name the shared variable, the CS, the mechanism (disable irq / TAS / semaphore), and a counterexample interleaving if the mechanism is removed. Then check liveness: can everyone starve?')
) AS c(pos, front, back)
WHERE d.slug = 'cs162'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 5. Semaphores, Monitors, Readers/Writers
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'sync-higher'
CROSS JOIN (VALUES
  (0,  'semaphore',
       'An integer with P (down, wait) and V (up, signal), atomic. A mutex is a semaphore initialized to 1. A resource count is a semaphore initialized to N. You can sleep on P if the value is 0. Invented for this; still the Pintos primitive.'),
  (1,  'P and V (do not mix them up)',
       'P: decrement, wait if you would go negative. V: increment, wake a waiter if any. Signaling a mutex you do not hold is a bug. Initial value is part of the spec: 0 means "wait for a partner," 1 means mutex, N means N widgets.'),
  (2,  'producer-consumer / bounded buffer',
       'Empty slots and full slots as two semaphores, plus a mutex for the buffer itself. Forgetting the mutex is a race on the indices; forgetting a semaphore is deadlock when the buffer is empty/full. 162 drawing: three primitives, not one.'),
  (3,  'monitors',
       'A module where all methods run with a hidden mutex, plus condition variables for waiting. Java synchronized is a monitor-ish. You wait for a condition, not for a lock-as-integer. Cleaner than raw semaphores if you remember to loop on the predicate.'),
  (4,  'condition variables: Mesa vs. Hoare',
       'Hoare: signal immediately runs the waiter (signaller pauses). Mesa (Java, pthreads, Pintos-style): signal moves waiter to ready; signaller keeps the lock; waiter must recheck the condition (while, not if). 162: Mesa + while loop or you have a bug.'),
  (5,  'lost wakeup',
       'Thread A checks "empty," then a context switch, B produces and signals, A then waits — signal already happened. Always: lock, check, wait atomically (the CV wait releases the lock inside). Naked sleep without the lock is the bug.'),
  (6,  'broadcast vs. signal',
       'signal/V wakes one. broadcast wakes all. Use broadcast when the woken thread might not be the one who can proceed (or when the predicate is not 1-to-1). Readers/writers and barrier patterns often broadcast. Spurious wakeups: Mesa, so loop anyway.'),
  (7,  'readers/writers problem',
       'Many readers OR one writer. Starvation: writers wait forever if readers keep coming (or vice versa). Solutions add a turnstile or writer preference. 162 wants you to state the policy (who starves) not only "use two semaphores."'),
  (8,  'priority inversion (preview)',
       'Low-priority holder of a lock; high-priority waiter; medium-priority runs and the high waits. Fix: priority inheritance (boost the holder). Mars Pathfinder is the 162 story. Scheduling week will return to this.'),
  (9,  'why not always a big kernel lock',
       'Correct but serializes all cores. Fine-grained locks scale and deadlock. 162 Project 2: lock per sleep queue vs. one global — document the order. Nested acquire must be rank-ordered.'),
  (10, 'sleeping in a CS',
       'If you sleep while holding a lock others need to make progress, you deadlock or convoy. Pattern: drop the lock, sleep, reacquire, recheck (Mesa). Or use a CV that drops the monitor lock for you.'),
  (11, 'semaphores as both lock and sleep',
       'Flexible and easy to misuse (P on the wrong one). Monitors push you toward "lock plus named conditions." 162 will accept either if the invariant is stated. Pintos: start with semaphores, layer locks and CVs on top as the project asks.'),
  (12, 'readers/writers vs. a mutex',
       'A mutex is correct for R/W data but kills concurrent readers. If reads dominate, R/W locks win. If CS is tiny, mutex is simpler. Measure; do not cargo-cult.'),
  (13, 'Pintos Project 2 (threads)',
       'Alarm clock, priority scheduling, and often priority donation / advanced scheduler depending on the term. The point is sleep/wake + scheduler interaction, not a clever linked list. Design: which lock protects the ready list.'),
  (14, 'higher-sync exam move',
       'Write the invariant (e.g. "count is the number of full slots"). Show P/V or wait/signal paired with the predicate. Circle the while loop if Mesa. Name a starvation scenario for R/W.')
) AS c(pos, front, back)
WHERE d.slug = 'cs162'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 6. Scheduling & Deadlock
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'scheduling'
CROSS JOIN (VALUES
  (0,  'CPU scheduling goals',
       'Turnaround, response/wait, throughput, fairness, utilization. They conflict (batch vs. interactive). 162 wants you to pick the metric the policy optimizes, not "make it fast." Preemptive vs. non-preemptive is a separate axis.'),
  (1,  'FCFS / FIFO',
       'Run in arrival order until block or exit (non-preemptive as usually taught). Convoy effect: a long CPU hog delays short jobs. Simple, not for terminals. Lecture 10 uses FCFS as the Pintos default mental model.'),
  (2,  'SJF / SRTF',
       'Shortest job first minimizes average turnaround (provably among non-preemptive). You do not know burst lengths — estimate with exponential average. SRTF is the preemptive version. Starves long jobs.'),
  (3,  'Round robin',
       'Time slice (quantum), then the tail of the ready queue. Small quantum: responsive, more context-switch overhead. Large: approaches FCFS. Interactive 162 default. If the quantum is "one instruction," you melt the cache.'),
  (4,  'priority scheduling',
       'Always run the highest priority ready thread. Can starve low priorities unless you age. Combine with RR inside a priority. User-set priorities + kernel boosting (I/O) is real Unix. Inversion: see donation.'),
  (5,  'priority donation / inheritance',
       'If H waits on a lock held by L, L temporarily runs at H''s priority (and donates through a chain). Nested donation is the hard Pintos case. Without it, a medium thread starves H while L sits ready-but-not-running.'),
  (6,  'proportional share (CFS idea)',
       'Each thread gets a weight; schedule as if they had virtual runtimes. Fair over intervals, good for mixed workloads. 162 A&D: stride/lottery as teaching cousins. Linux CFS is the case study, not something you implement in Pintos unless the term asks.'),
  (7,  'MLFQ (multi-level feedback)',
       'New jobs start high; CPU hogs drop. Approximates SJF without knowing bursts, stays responsive. Tuning the queues is an art. Starvation of low queues needs boosting.'),
  (8,  'I/O bound vs. CPU bound',
       'I/O bound: short CPU, then block — wants to run soon after becoming ready (response). CPU bound: fills the quantum. A good scheduler lets I/O bound sneak in. Utilization of disk and CPU both matter (multiprogramming again).'),
  (9,  'deadlock: four conditions',
       'Mutual exclusion, hold-and-wait, no preemption of the resource, circular wait. Remove any one. 162: lock ordering (break circular wait) is the practical fix. Detection (wait-for graph) vs. prevention vs. ostrich.'),
  (10, 'deadlock vs. starvation vs. livelock',
       'Deadlock: cycle, nobody proceeds. Starvation: some thread never wins, others do. Livelock: everyone is busy but the useful CS never completes (retry loops). Different pictures; different fixes.'),
  (11, 'banker''s algorithm (light)',
       'Grant a request only if some order still exists that all can finish (safe state). Needs max claims in advance — rare in general-purpose OS. 162: know "safe vs. unsafe," do not implement it in Pintos.'),
  (12, 'work-conserving',
       'Never idle a CPU if a ready thread exists. Most 162 policies are. Affinity and power management sometimes are not. If your scheduler leaves a core idle with a ready list, that is a bug.'),
  (13, 'timer interrupt',
       'The heartbeat of preemption. Too slow: hogs. Too fast: overhead. Tickless kernels exist; 162 still draws a periodic tick. Pintos: thread_tick and time-slicing live here.'),
  (14, 'scheduling exam move',
       'List jobs with arrival and burst, draw the Gantt chart, compute wait/turnaround. Then: who starves? Is it preemptive? If they add a lock, can inversion happen? Numbers first, slogans second.')
) AS c(pos, front, back)
WHERE d.slug = 'cs162'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 7. Address Translation
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'virtual-memory'
CROSS JOIN (VALUES
  (0,  'why virtual memory (162)',
       'Give each process a private VA space (isolation), illusion of lots of RAM (demand paging), and convenient linking (every program can start at the same VA). 61C taught the hardware; 162 is the kernel policy: page tables, faults, swapping.'),
  (1,  'base/limit (segmentation start)',
       'A process gets a base and a bound; VA + base = PA, check against limit. Fast, contiguous, external fragmentation, hard to share parts. Historical and still the intuition for "relocation."'),
  (2,  'segmentation',
       'Several base/limit pairs (code, heap, stack). Grows independently, can share a code segment. External fragmentation remains. x86 had this; 162 still draws segments then says pages won.'),
  (3,  'paging',
       'Fixed-size pages (4 KiB typical). VA = VPN + offset. VPN → PPN via a page table; offset unchanged. No external fragmentation of RAM (internal: last page). Isolation: a process cannot even name another''s PPNs.'),
  (4,  'page table entry flags',
       'Valid/present, writable, user/supervisor, accessed, dirty, NX. A 61C PTE; the OS sets policy. Copy-on-write: map read-only, on write fault copy and set writable. 162 midterm: which bit would you change for COW.'),
  (5,  'linear page table cost',
       'A 32-bit VA with 4 KiB pages is a million PTEs per process if dense — too big, and sparse programs waste it. Hence multi-level tables (and inverted tables, hashed, but 162 emphasizes the tree).'),
  (6,  'multi-level page tables',
       'A tree: top-level indexes a directory of second-level pages, only allocate leaves you use. Walk: several memory refs per translation — TLB exists because of this. RISC-V Sv39 is the 61C picture; 162 will make you count the references.'),
  (7,  'shared pages',
       'Two processes'' PTEs point at the same PPN (libraries, shared memory). Permissions can differ (one write, one read). Must not free the physical page until the last mapping is gone (reference count).'),
  (8,  'kernel vs. user in the page table',
       'User PTEs have the user bit; kernel mappings do not. After a process switch you still want the kernel mapped (or you cannot run). Some designs keep a kernel page table plus per-process user tables. Pintos: kernel is always there; user mappings change.'),
  (9,  'loading and linking (catalog)',
       'The loader maps ELF segments (mmap-like). Dynamic linker resolves libraries. Position-independent code plus ASLR (161) live here. 162: exec is "build an address space from a file," not magic.'),
  (10, 'internal vs. external fragmentation',
       'Paging: internal (slack in the last page). Segmentation/variable partitions: external (holes between blocks). 162 will ask which allocator suffers which. Buddy/slab are kernel heap stories for internal in the kernel.'),
  (11, 'VA size vs. PA size',
       'They need not match (64-bit VA, 48-bit PA). Unused high VPN bits. A process can have a VA hole (stack at top, heap low). Sparse is why trees beat arrays.'),
  (12, 'protection bits vs. swapping',
       'Not present can mean "on disk" or "never mapped" (segfault). The OS distinguishes by another bit or a software PTE format. User-level page fault on an unmapped stack vs. a grow-the-stack policy is a 162 design choice.'),
  (13, 'HW4 / address spaces in projects',
       'You will think about stacks, heaps, and kernel mappings as regions. User pointers must be in user PTEs and present (or fault-in). The syscall copyin loop is complete mediation for memory.'),
  (14, 'translation exam move',
       'Split the VA into VPN fields and offset. Walk the levels they gave you. Say hit/miss at each, PA = PPN concatenated with offset. If a bit is off, name the exception (fault vs. kernel panic vs. ignore).')
) AS c(pos, front, back)
WHERE d.slug = 'cs162'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 8. TLBs & Demand Paging
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'paging'
CROSS JOIN (VALUES
  (0,  'TLB',
       'Translation Lookaside Buffer: cache of VA→PA (or VPN→PPN) translations. Hit: skip the page-table walk. Miss: walk, fill TLB. On process switch, flush or tag with ASID. 61C hardware; 162: the kernel must shoot down stale entries after unmap.'),
  (1,  'TLB and page-table writes',
       'If you change a PTE, the TLB may still have the old mapping (incoherent). Invli/shootdown required. Multiprocessor: IPI to other cores. 162 exam: "we set writable in the PTE but the process still faults" — leftover TLB.'),
  (2,  'demand paging',
       'Do not load the whole program at exec. Map PTEs invalid; the first access faults; kernel reads the page from the file/swap and resumes. Illusion of more memory than DRAM. Startup is faster; the working set stays hot.'),
  (3,  'page fault handling (steps)',
       'Trap, save state, check the VA is legal, find a frame (maybe evict), I/O the page in, update PTE, shoot down TLB, restart the instruction. Restart, not skip — the faulting load must run. Blocking in the fault handler is normal (sleep on disk).'),
  (4,  'replacement: OPT, LRU, Clock',
       'OPT (Belady): evict the page used farthest in the future — offline bound. LRU: approximate OPT, expensive exact. Clock/second-chance: use the accessed bit, sweep. 162 will run a reference string and ask miss counts.'),
  (5,  'Belady''s anomaly',
       'FIFO can miss more with more frames. LRU and OPT do not. If they give FIFO numbers that look "wrong," this is why. Do not use FIFO as your 162 intuition for "bigger cache is better" without checking.'),
  (6,  'working set and thrashing',
       'Working set: pages touched in the last window. If the sum of working sets exceeds RAM, the system pages all day (thrash): high disk, low useful CPU. Fix: admit fewer processes, or buy RAM. Scheduler and VM interact (swap out a whole process).'),
  (7,  'global vs. local replacement',
       'Global: steal from any process (good utilization, can starve one). Local: each process has a frame budget (fairer, can waste RAM). Clock is often global. 162: name the victim''s owner.'),
  (8,  'dirty bit and write-back',
       'Evicting a clean page is free (reload from file). Dirty pages need a write to swap/file. Clustering writes helps disks. 162: a replacement policy that ignores dirty will look cheaper than it is.'),
  (9,  'prefetch / clustering',
       'On a fault, bring nearby pages (spatial locality, ELF segments). Wrong prefetch wastes frames. Sequential file read is the happy case. Demand paging without prefetch still works; prefetch is policy.'),
  (10, 'stack growth',
       'A fault just below the stack pointer might be a legal grow rather than a segfault. Heuristic: only if it looks like a stack access. Getting this wrong either smashes the heap or crashes good programs. Userprog meets VM here.'),
  (11, 'swap vs. mmap file backing',
       'Anonymous pages (heap/stack) go to swap. File-backed pages can be dropped if clean and re-read from the file. Same fault handler, different backing store. Unified VM is why mmap feels like memory.'),
  (12, 'page sizes and huge pages (light)',
       'Bigger pages: smaller page tables, better TLB reach, more internal fragmentation. 162 mentions it; you will not implement 2 MiB pages in Pintos. TLB shootdown cost also grows with mapping changes.'),
  (13, 'AMAT-style VM thinking',
       'Hit in TLB vs. walk vs. disk: orders of magnitude. A 1% miss rate to disk kills you. This is 61C AMAT with a page as the block. 162 wants the qualitative cliff, not a new formula.'),
  (14, 'paging exam move',
       'Reference string, frame count, policy. Mark hits/faults, show which page leaves, whether it was dirty. Then one sentence on thrashing if the working set does not fit.')
) AS c(pos, front, back)
WHERE d.slug = 'cs162'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 9. I/O, Devices & File Systems
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'io-filesystems'
CROSS JOIN (VALUES
  (0,  'device driver role',
       'Translate generic kernel I/O (read block 17) into device register pokes, DMA setup, and interrupt handlers. Isolate the rest of the kernel from hardware chaos. A bad driver is still in the TCB. 162: interrupt bottom halves, don''t do heavy work in the IRQ if you can defer.'),
  (1,  'polling vs. interrupts vs. DMA',
       'Polling: spin on status (simple, wastes CPU). Interrupt: device signals completion. DMA: device writes memory itself (CPU free, cache coherence issues — 61C). 162 storage: DMA + interrupt is the default disk path.'),
  (2,  'disk geometry (HDD intuition)',
       'Seek + rotation + transfer. Random I/O is seek-bound; sequential is transfer-bound. 162 file systems try to be sequential (layout, clustering). SSDs change the constants, not the need for a block layer.'),
  (3,  'queueing (M/M/1 slogan)',
       'As utilization approaches 1, wait time blows up (1/(1-u)). File systems and disks need slack. 162: a "busy" disk at 90% is not 10% slower — it is much slower. Burstiness makes it worse than the simple formula.'),
  (4,  'block layer / buffer cache',
       'The kernel caches disk blocks in RAM. Reads may hit; writes may be delayed (write-back) or forced (fsync, write-through). A crash can lose recent writes unless you journal or fsync. Pintos FS: a buffer cache is a typical Project 3 piece.'),
  (5,  'inode',
       'On-disk structure: type, size, timestamps, pointers to data blocks (direct, indirect, double-indirect). The inode number plus the file system id is the file''s identity. Directories map names to inode numbers. 162: a file is not its name.'),
  (6,  'directories and hard links',
       'A directory is a list of (name, inumber). Multiple names can point at one inode (hard link); the inode link count must hit 0 before reuse. Cannot hard-link directories in Unix (cycles). Soft/symbolic links are paths, not inode aliases.'),
  (7,  'FAT vs. Unix inode FS (case studies)',
       'FAT: linked list of clusters, simple, poor random, no real inodes. Unix: inodes + trees of blocks, better random, extra metadata. 162 wants layout vs. crash vs. performance tradeoffs, not a Microsoft history recitation.'),
  (8,  'fsck vs. journaling',
       'fsck: after crash, walk the FS to restore invariants (slow). Journal: write intent to a log, then the home locations; recovery replays. Ordered vs. data journaling: does file data go in the log? 162 reliability lecture starts here.'),
  (9,  'bitmaps and allocation',
       'Free-block and inode bitmaps. Extents vs. one-block-at-a-time. Locality: put a file''s blocks near its inode and near each other. Fragmentation over time is why you defrag HDDs and why SSDs still care about sequential writes.'),
  (10, 'namei / pathname walk',
       'Start at cwd or root, look up each component, check search permission, follow mounts. TOCTOU if you walk twice (161). Caches (dcache) make this fast. 162: each lookup is a disk read in the worst case without cache.'),
  (11, 'VFS (virtual file system)',
       'A kernel interface so ext4, NFS, and proc look like files. Operations table: lookup, read, write, readdir. Mount attaches a FS on a directory. 162 distributed week: NFS is a VFS with a network.'),
  (12, 'Pintos Project 3 (filesys)',
       'Typically: indexed inodes (beyond the tiny base FS), subdirectories, buffer cache, extensible files. Design the on-disk format first. Crash consistency may or may not be graded — still think about what a crash would do.'),
  (13, 'I/O schedulers (light)',
       'Reorder disk requests to reduce seeks (elevator/C-SCAN). SSDs weaken this. Fairness among processes still matters (one reader should not starve). 162: policy at the block layer, mechanism is the request queue.'),
  (14, 'FS exam move',
       'Draw the inode, the indirect block, and the data. Count disk reads for a random byte (cache cold vs. hot). Then: what does fsync force to disk? What does a crash lose if the journal did not commit?')
) AS c(pos, front, back)
WHERE d.slug = 'cs162'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 10. Reliability & Distributed Systems
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'distributed'
CROSS JOIN (VALUES
  (0,  'end-to-end argument (Saltzer)',
       'Functions placed at low layers may be incomplete or redundant; the application still has to check. TCP checksums do not replace a file-transfer checksum. 162: put reliability where the true endpoints are — and still keep useful hops (TLS vs. disk ECC is a 161/162 mashup).'),
  (1,  'fail-stop vs. Byzantine (162 level)',
       'Fail-stop: a node crashes and others can tell. Byzantine: a node lies. 162 2PC assumes fail-stop-ish crashes, not full Byzantine. Raft homework is crash faults. Do not say "Byzantine" unless the exam does.'),
  (2,  'transactions: ACID slogan',
       'Atomicity: all or nothing. Consistency: invariants hold if you started legal. Isolation: as if serial. Durability: after commit, a crash does not undo. 162 FS journals are atomicity+durability for metadata. Databases add more isolation levels.'),
  (3,  'WAL / logging',
       'Write-ahead: log the change before the home location (and before acknowledging commit). Recovery: redo committed, undo uncommitted. Group commit batches log flushes. Same idea as FS journaling, more general.'),
  (4,  'two-phase commit (2PC)',
       'Coordinator asks participants to prepare; if all yes, commit; else abort. Blocking if the coordinator dies after prepare (participants uncertain). 162: draw the states (init, prepared, committed/aborted). Not magic availability — it is atomicity across machines.'),
  (5,  'RPC',
       'Make a remote call look like a local procedure: marshal args, send, wait, unmarshal. Failures are not local: timeout, duplicate, reorder. At-most-once vs. at-least-once. Idempotent operations survive retries. SunRPC/NFS is the case study; gRPC is the 2020s cousin.'),
  (6,  'at-least-once vs. at-most-once',
       'At-least-once: retry until a reply — may execute twice (need idempotency). At-most-once: extra IDs/duplicates filtering — harder, still can lose on crash. 162 HTTP homework: GET should be idempotent; POST often is not. MapReduce retries tasks because work is designed to be replay-safe.'),
  (7,  'NFS (idea)',
       'Stateless-ish remote FS: operations are RPCs, clients cache, server may not remember opens the way Unix does. Classic: "stateless for crash recovery" vs. close-to-open consistency surprises. 162: caching vs. consistency is the theme.'),
  (8,  'MapReduce (HW5)',
       'Map independent records, shuffle by key, reduce. The master re-runs failed tasks. 162 homework is a mini version in C or Rust — think about worker crash, not Spark APIs. Why it fits 162: RPC, fault restart, and no shared memory.'),
  (9,  'Raft (HW6 idea)',
       'Replicated log: leader election, heartbeats, majority for commit. 162 wants the slogans: majority, term numbers, "never overwrite committed." Implementing a full Raft is the homework; the exam is "why majority" and "what split brain would do."'),
  (10, 'CAP (exam caution)',
       'Under partition you cannot have both perfect consistency and perfect availability. 162 will not replace a distributed-systems course; say what you give up if the network splits. 2PC gives atomicity and can block (availability hit).'),
  (11, 'idempotency and retries',
       'A distributed world retries. Design operations so doing them twice is safe, or keep a replay cache (at-most-once). FS create vs. write-at-offset have different answers. 162: if your protocol cannot name a request, you cannot dedupe.'),
  (12, 'clocks and ordering (light)',
       'Physical clocks drift; you cannot assume a global now. Lamport/logical clocks appear if the term has time. Otherwise: do not timestamp-order with NTP and call it consensus. Raft uses terms, not wall clocks, for safety.'),
  (13, '162 closing picture',
       'User/kernel dual mode, then multiplex CPU (threads, schedule, sync), multiplex memory (pages, TLB, faults), multiplex disk (inodes, cache, journal), then multiplex machines (RPC, 2PC, replication). Pintos is the first three in one tiny kernel. That is Operating Systems and System Programming.'),
  (14, 'distributed exam move',
       'Who is the coordinator? What is committed state after a crash at this arrow? Can a retry double-apply? If two nodes cannot talk, who still makes progress? Draw the message diagram before naming Raft or 2PC.')
) AS c(pos, front, back)
WHERE d.slug = 'cs162'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

UPDATE public.decks
SET    card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE  slug = 'cs162';
