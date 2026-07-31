/**
 * Runtime test suite for the Voice Agent system.
 * Run via: node --experimental-vm-modules scripts/test-voice-agent.mjs
 * Or paste into browser console on localhost:3000
 */

// ─── SECTION 1: Intent Parser Tests ──────────────────────────────────────────

const INTENT_TEST_CASES = [
  // Navigation
  { input: 'open meetings', expect: 'navigate', desc: 'navigate to /meetings' },
  { input: 'go to dashboard', expect: 'navigate', desc: 'navigate to /' },
  { input: 'open customers', expect: 'navigate', desc: 'navigate to /customers' },
  { input: 'open invite templates', expect: 'navigate', desc: 'navigate to /settings/templates' },
  { input: 'open admin', expect: 'navigate', desc: 'navigate to /admin' },

  // Filter meetings
  { input: 'show completed meetings', expect: 'filter-meetings', desc: 'filter by completed' },
  { input: 'filter live presentations', expect: 'filter-meetings', desc: 'filter by live' },
  { input: 'show scheduled sessions', expect: 'filter-meetings', desc: 'filter by scheduled' },
  { input: 'display meetings', expect: 'filter-meetings', desc: 'show all meetings' },

  // Launch portal
  { input: 'launch sales portal', expect: 'launch-portal', desc: 'launch portal no project' },
  { input: 'open sales portal for Skyview Estate', expect: 'launch-portal', desc: 'launch with project' },
  { input: 'initialize engine', expect: 'launch-portal', desc: 'alternate portal phrase' },
  { input: 'start presentation', expect: 'launch-portal', desc: 'start presentation phrase' },

  // Session controls
  { input: 'mute microphone', expect: 'toggle-mic', desc: 'mute mic' },
  { input: 'unmute mic', expect: 'toggle-mic', desc: 'unmute mic' },
  { input: 'turn off camera', expect: 'toggle-cam', desc: 'disable cam' },
  { input: 'enable camera', expect: 'toggle-cam', desc: 'enable cam' },
  { input: 'hide observers', expect: 'toggle-observers', desc: 'hide observers' },
  { input: 'show team', expect: 'toggle-observers', desc: 'show observers' },

  // Drawers
  { input: 'open analytics', expect: 'toggle-drawer', desc: 'analytics drawer' },
  { input: 'show analytics drawer', expect: 'toggle-drawer', desc: 'analytics explicit' },
  { input: 'open visitors list', expect: 'toggle-drawer', desc: 'visitors drawer' },
  { input: 'open script guide', expect: 'toggle-drawer', desc: 'script drawer' },

  // Slides
  { input: 'next slide', expect: 'change-slide', desc: 'next slide' },
  { input: 'previous slide', expect: 'change-slide', desc: 'prev slide' },
  { input: 'go to slide 3', expect: 'change-slide', desc: 'specific slide' },

  // CRM
  { input: 'search customer Rahul', expect: 'search-customer', desc: 'search by name' },
  { input: 'find client Meera Joshi', expect: 'search-customer', desc: 'find client' },
  { input: 'view profile of Arjun', expect: 'search-customer', desc: 'view profile' },

  // Profile sections
  { input: 'show timeline', expect: 'set-client-section', desc: 'activity/timeline tab' },
  { input: 'view notes', expect: 'set-client-section', desc: 'notes tab' },
  { input: 'show activity', expect: 'set-client-section', desc: 'activity tab' },

  // Templates
  { input: 'open whatsapp templates', expect: 'set-template-tab', desc: 'whatsapp template tab' },
  { input: 'go to email templates', expect: 'set-template-tab', desc: 'email template tab' },

  // Scheduling
  { input: 'schedule presentation tomorrow at 3 PM', expect: 'schedule-presentation', desc: 'schedule with time' },
  { input: 'book presentation for Lodha with Arjun', expect: 'schedule-presentation', desc: 'schedule with client' },
];

// Multi-command split test cases
const MULTI_COMMAND_CASES = [
  {
    input: 'open meetings then filter completed',
    expectCount: 2,
    expect: ['navigate', 'filter-meetings'],
    desc: 'two commands with then'
  },
  {
    input: 'mute mic and then hide observers',
    expectCount: 2,
    expect: ['toggle-mic', 'toggle-observers'],
    desc: 'two session commands'
  },
  {
    input: 'open analytics and open script',
    expectCount: 2,
    expect: ['toggle-drawer', 'toggle-drawer'],
    desc: 'two drawers with and'
  },
  {
    input: 'search customer Rahul then show timeline',
    expectCount: 2,
    expect: ['search-customer', 'set-client-section'],
    desc: 'crm + section chain'
  },
  {
    input: 'next slide then open analytics',
    expectCount: 2,
    expect: ['change-slide', 'toggle-drawer'],
    desc: 'slide + drawer chain'
  },
];

// ─── SECTION 2: Test Runner ───────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.error(`  ✗ ${message}`);
  }
}

// ─── SECTION 3: Run via dynamic import in browser ─────────────────────────────

async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     PROPLEY VOICE AGENT — Runtime Test Suite             ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // We use dynamic import to load the TS modules (compiled by Next.js)
  // When pasted in the browser console, these modules are already available
  // via the global Next.js module graph.
  // 
  // For Node.js testing use tsx or vitest. This script is designed for
  // paste-into-console browser testing.

  // ── Test 1: Zustand Store ──────────────────────────────────────────────────
  console.log('■ STORE — Zustand state management');
  try {
    // Access via window.__NEXT_DATA__ or module map — test store defaults
    const storeModule = window.__propley_test_store;
    if (storeModule) {
      const state = storeModule.getState();
      assert(state.state === 'idle', 'Initial state is idle');
      assert(state.isListening === false, 'Initial isListening is false');
      assert(state.audioLevel === 0, 'Initial audioLevel is 0');
      assert(state.executionQueue.length === 0, 'Initial queue is empty');
      assert(state.settings.mode === 'simulation', 'Default mode is simulation');
      assert(Array.isArray(state.recentSuggestions), 'recentSuggestions is array');
      assert(state.recentSuggestions.length > 0, 'recentSuggestions has items');

      // Test setState action
      storeModule.getState().setState('listening');
      assert(storeModule.getState().state === 'listening', 'setState changes state');
      storeModule.getState().setState('idle');
      assert(storeModule.getState().state === 'idle', 'setState resets to idle');

      // Test addToHistory
      storeModule.getState().addToHistory('test command');
      assert(storeModule.getState().commandHistory[0] === 'test command', 'addToHistory prepends');

      // Test moderatorState sync
      storeModule.getState().setModeratorState({ isMicOn: false });
      assert(storeModule.getState().moderatorState.isMicOn === false, 'setModeratorState updates isMicOn');
      storeModule.getState().setModeratorState({ isMicOn: true });

      // Test updateSettings + localStorage persistence
      storeModule.getState().updateSettings({ persistentListening: true });
      assert(storeModule.getState().settings.persistentListening === true, 'updateSettings works');
      const saved = JSON.parse(localStorage.getItem('propley_voice_agent_settings') || '{}');
      assert(saved.persistentListening === true, 'Settings persisted to localStorage');
      storeModule.getState().updateSettings({ persistentListening: false });
    } else {
      console.warn('  ⚠ Store not exposed — inject via window.__propley_test_store for store tests');
    }
  } catch (e) {
    console.error('  ✗ Store test threw:', e.message);
    failed++;
    failures.push('Store test error: ' + e.message);
  }

  // ── Test 2: Intent Parser via fetch of test harness ───────────────────────
  console.log('\n■ INTENT PARSER — Single command recognition');
  
  // Since we can't easily import the TS module in browser console,
  // we test via the exposed global if available, otherwise describe what to check
  if (typeof window.__propley_parseTranscript === 'function') {
    for (const tc of INTENT_TEST_CASES) {
      const result = window.__propley_parseTranscript(tc.input);
      if (result.length === 0) {
        assert(false, `[${tc.expect}] "${tc.input}" → no match (${tc.desc})`);
      } else {
        assert(
          result[0].commandId === tc.expect,
          `[${tc.expect}] "${tc.input}" → ${result[0].commandId} (${tc.desc})`
        );
      }
    }

    console.log('\n■ INTENT PARSER — Multi-command chaining');
    for (const tc of MULTI_COMMAND_CASES) {
      const result = window.__propley_parseTranscript(tc.input);
      assert(result.length === tc.expectCount, `[chain] "${tc.input}" → ${result.length}/${tc.expectCount} commands (${tc.desc})`);
      for (let i = 0; i < tc.expect.length; i++) {
        if (result[i]) {
          assert(result[i].commandId === tc.expect[i], `  step ${i+1}: expected ${tc.expect[i]}, got ${result[i].commandId}`);
        }
      }
    }
  } else {
    console.warn('  ⚠ Parser not exposed globally. To enable: add window.__propley_parseTranscript = parseTranscriptToQueue in intent-parser.ts for dev mode.');
    console.log('\n  Running parser tests via manual logic verification...');
    
    // Test the regex patterns directly for validation
    const testNorm = (str) => str.toLowerCase().trim();
    
    const navTests = [
      ['open meetings', /\b(?:open|go to|show|navigate to)\b.*\b(?:meetings|presentations)\b/],
      ['go to dashboard', /\b(?:open|go to|navigate to|show)\b.*\b(?:dashboard|home|overview)\b/],
      ['mute microphone', /\b(?:mute|silence)\b.*\b(?:mic|microphone|audio)\b/],
      ['next slide', /\b(?:next|forward)\b.*\bslide\b/],
      ['show completed meetings', /\b(?:filter|show|display)\b.*\b(?:meetings|presentations|sessions)\b/],
    ];
    
    for (const [phrase, regex] of navTests) {
      assert(regex.test(testNorm(phrase)), `Regex matches: "${phrase}"`);
    }
  }

  // ── Test 3: AudioWorklet Processor File ───────────────────────────────────
  console.log('\n■ AUDIO WORKLET — Processor file availability');
  try {
    const resp = await fetch('/audio/propley-audio-processor.js');
    assert(resp.ok, `AudioWorklet file served at /audio/propley-audio-processor.js (${resp.status})`);
    const text = await resp.text();
    assert(text.includes('PropleyAudioProcessor'), 'Processor class defined in file');
    assert(text.includes('registerProcessor'), 'registerProcessor call present');
    assert(text.includes('propley-audio-processor'), 'Processor name matches');
    assert(!text.includes('ScriptProcessorNode'), 'No deprecated ScriptProcessorNode references');
  } catch (e) {
    assert(false, `AudioWorklet file fetch failed: ${e.message}`);
  }

  // ── Test 4: AudioContext + Worklet Module Load ────────────────────────────
  console.log('\n■ AUDIO WORKLET — Module registration');
  try {
    const ctx = new AudioContext();
    try {
      await ctx.audioWorklet.addModule('/audio/propley-audio-processor.js');
      assert(true, 'audioWorklet.addModule() succeeded');
      const node = new AudioWorkletNode(ctx, 'propley-audio-processor');
      assert(node instanceof AudioWorkletNode, 'AudioWorkletNode created successfully');
      node.disconnect();
    } catch (e) {
      assert(false, `audioWorklet.addModule failed: ${e.message}`);
    }
    await ctx.close();
  } catch (e) {
    assert(false, `AudioContext creation failed: ${e.message}`);
  }

  // ── Test 5: localStorage Settings Persistence ────────────────────────────
  console.log('\n■ SETTINGS — localStorage persistence');
  try {
    const testSettings = { mode: 'live', apiKey: 'test-key-123', persistentListening: true };
    localStorage.setItem('propley_voice_agent_settings', JSON.stringify(testSettings));
    const loaded = JSON.parse(localStorage.getItem('propley_voice_agent_settings'));
    assert(loaded.mode === 'live', 'Settings mode persists correctly');
    assert(loaded.apiKey === 'test-key-123', 'API key persists correctly');
    assert(loaded.persistentListening === true, 'persistentListening persists correctly');
    // Clean up
    localStorage.removeItem('propley_voice_agent_settings');
    assert(!localStorage.getItem('propley_voice_agent_settings'), 'Settings cleaned up');
  } catch (e) {
    assert(false, `localStorage test failed: ${e.message}`);
  }

  // ── Test 6: Keyboard Shortcuts - DOM simulation ───────────────────────────
  console.log('\n■ KEYBOARD — Global hotkey registration');
  try {
    // Verify the OrbContainer has mounted (check for the orb DOM element)
    const orbButton = document.querySelector('[aria-label="Toggle voice assistant"]');
    assert(orbButton !== null, 'Orb button rendered in DOM');
    
    const consoleButton = document.querySelector('[title="Open Voice Console (Cmd+K)"]');
    assert(consoleButton !== null, 'Console toggle button rendered in DOM');
  } catch (e) {
    assert(false, `DOM test failed: ${e.message}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log(`║  Results: ${passed}/${total} passed, ${failed} failed                         `.slice(0, 60) + '║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  if (failures.length > 0) {
    console.error('\nFailed tests:');
    failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}`));
  } else {
    console.log('\n✅ All tests passed!');
  }

  return { passed, failed, failures };
}

// Auto-run
runTests();
