/**
 * VenueFlow Event Simulation Engine
 * 
 * Simulates a realistic live cricket match with phases,
 * score updates, player events, and crowd behavior changes.
 * Provides real-world data that drives the entire app.
 * 
 * @module event-engine
 */

'use strict';

const EventEngine = (() => {

  /* ==========================================
     State
     ========================================== */

  let _isRunning = false;
  let _intervalId = null;
  let _listeners = [];

  /** Current match state */
  let _matchState = {
    phase: 'active',
    inning: 1,
    overs: 15.3,
    score: { runs: 142, wickets: 3 },
    teamBatting: 'India',
    teamBowling: 'Australia',
    batsmen: [
      { name: 'V. Kohli', runs: 68, balls: 52, fours: 7, sixes: 2, isStriker: true },
      { name: 'KL Rahul', runs: 34, balls: 28, fours: 3, sixes: 1, isStriker: false }
    ],
    bowler: { name: 'P. Cummins', overs: '3.3', maidens: 0, runs: 28, wickets: 1 },
    runRate: 9.28,
    recentBalls: ['1', '4', '0', '2', '6', '1', 'W', '0', '4', '1', '2', '0'],
    partnerships: 72,
    lastWicket: 'R. Pant c Smith b Starc 21(15)',
    extras: 8,
    fallOfWickets: ['24/1 (3.2)', '56/2 (7.1)', '70/3 (9.4)'],
    matchTitle: 'IND vs AUS — 3rd ODI',
    venue: 'Narendra Modi Stadium, Ahmedabad',
    toss: 'India won the toss and chose to bat',
    startTime: '14:00 IST',
    weather: { condition: 'Clear', temp: 32, humidity: 45, wind: '12 km/h NW' },
    timeElapsed: 0 // minutes
  };

  /** Phase timeline for the match */
  const PHASE_SCHEDULE = [
    { phase: 'pre_event', startMin: -60, label: 'Gates Open', desc: 'Attendees arriving' },
    { phase: 'entry', startMin: -30, label: 'Pre-Match', desc: 'Team warm-up' },
    { phase: 'active', startMin: 0, label: '1st Innings', desc: 'India batting' },
    { phase: 'break', startMin: 150, label: 'Innings Break', desc: '20 min interval' },
    { phase: 'active', startMin: 170, label: '2nd Innings', desc: 'Australia batting' },
    { phase: 'post_event', startMin: 320, label: 'Post Match', desc: 'Presentations & exit' }
  ];

  /** Commentary pool */
  const COMMENTARY = [
    'Short delivery outside off, punched through covers for FOUR! Elegant shot.',
    'Full and straight, defended solidly back to the bowler.',
    'Good length delivery, pushed to mid-off for a quick single.',
    'Bouncer! Ducked under it well. Good awareness.',
    'SIX! Over long-on! The crowd erupts! 🎉',
    'Width offered outside off, cut hard to the boundary! FOUR!',
    'Dot ball. Good yorker, dug out back down the pitch.',
    'Flicked off the pads for two. Good running between the wickets.',
    'Appeal for LBW! Not out, going down leg side.',
    'Driven elegantly through mid-off. One run.',
    'Short ball pulled over mid-wicket for a single.',
    'Full toss on leg stump, worked away for two runs.',
  ];

  /* ==========================================
     Initialization
     ========================================== */

  /**
   * Start the event simulation.
   * @param {number} [intervalMs=8000] - Update interval
   */
  function start(intervalMs = 8000) {
    if (_isRunning) return;
    _isRunning = true;

    // Emit initial state
    _notifyListeners('matchUpdate', getMatchState());
    _notifyListeners('phaseChange', { phase: _matchState.phase, label: 'Match Live' });

    // Simulate ball-by-ball updates
    _intervalId = setInterval(() => {
      _simulateBall();
      _notifyListeners('matchUpdate', getMatchState());
    }, intervalMs);

    console.log('[EventEngine] Match simulation started');
  }

  /**
   * Stop the simulation.
   */
  function stop() {
    if (_intervalId) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
    _isRunning = false;
  }

  /* ==========================================
     Ball Simulation
     ========================================== */

  /**
   * Simulate a single ball delivery.
   * @private
   */
  function _simulateBall() {
    const rand = Math.random();
    let outcome;
    let runs = 0;

    // Probability distribution for outcomes
    if (rand < 0.30) {
      outcome = '0'; runs = 0; // 30% dot ball
    } else if (rand < 0.50) {
      outcome = '1'; runs = 1; // 20% single
    } else if (rand < 0.62) {
      outcome = '2'; runs = 2; // 12% double
    } else if (rand < 0.65) {
      outcome = '3'; runs = 3; // 3% triple
    } else if (rand < 0.80) {
      outcome = '4'; runs = 4; // 15% four
    } else if (rand < 0.90) {
      outcome = '6'; runs = 6; // 10% six
    } else if (rand < 0.93) {
      outcome = 'W'; runs = 0; // 3% wicket
    } else if (rand < 0.95) {
      outcome = 'WD'; runs = 1; // 2% wide
    } else if (rand < 0.97) {
      outcome = 'NB'; runs = 1; // 2% no ball
    } else {
      outcome = 'LB'; runs = 1; // 3% leg-bye
    }

    // Update score
    _matchState.score.runs += runs;

    // Handle wicket
    if (outcome === 'W') {
      _matchState.score.wickets += 1;
      const dismissedBatsman = _matchState.batsmen[0];
      _matchState.lastWicket = `${dismissedBatsman.name} b ${_matchState.bowler.name} ${dismissedBatsman.runs}(${dismissedBatsman.balls})`;
      _matchState.fallOfWickets.push(
        `${_matchState.score.runs}/${_matchState.score.wickets} (${Math.floor(_matchState.overs)}.${Math.round((_matchState.overs % 1) * 10)})`
      );
      _matchState.partnerships = 0;
      
      // New batsman
      const newNames = ['S. Iyer', 'H. Pandya', 'R. Jadeja', 'A. Patel', 'J. Bumrah'];
      const nextName = newNames[Math.min(_matchState.score.wickets - 1, newNames.length - 1)];
      _matchState.batsmen[0] = { name: nextName, runs: 0, balls: 0, fours: 0, sixes: 0, isStriker: true };

      // Generate wicket alert
      _notifyListeners('highlight', {
        type: 'wicket',
        title: '🏏 WICKET!',
        message: `${_matchState.lastWicket}. ${_matchState.teamBatting} ${_matchState.score.runs}/${_matchState.score.wickets}`,
        commentary: `OUT! ${dismissedBatsman.name} departs! What a delivery from ${_matchState.bowler.name}!`
      });
    } else {
      // Update striker stats
      const striker = _matchState.batsmen.find(b => b.isStriker);
      if (striker && outcome !== 'WD' && outcome !== 'NB') {
        striker.runs += runs;
        striker.balls += 1;
        if (runs === 4) striker.fours += 1;
        if (runs === 6) striker.sixes += 1;
      }
      _matchState.partnerships += runs;

      // Rotate strike on odd runs
      if (runs % 2 === 1) {
        _matchState.batsmen.forEach(b => b.isStriker = !b.isStriker);
      }

      // Milestone alerts
      if (striker && striker.runs >= 50 && striker.runs - runs < 50) {
        _notifyListeners('highlight', {
          type: 'milestone',
          title: '🎯 FIFTY!',
          message: `${striker.name} reaches 50! (${striker.balls} balls, ${striker.fours}×4, ${striker.sixes}×6)`,
          commentary: `Brilliant half-century! The crowd gives a standing ovation! 🙌`
        });
      }

      if (outcome === '6') {
        _notifyListeners('highlight', {
          type: 'six',
          title: '💥 SIX!',
          message: `${_matchState.batsmen.find(b => !b.isStriker)?.name || 'Batsman'} launches it into the stands!`,
          commentary: COMMENTARY[4]
        });
      }
    }

    // Update overs (increment by 0.1, roll over at .6)
    if (outcome !== 'WD' && outcome !== 'NB') {
      let overDecimal = Math.round((_matchState.overs % 1) * 10);
      overDecimal += 1;
      if (overDecimal >= 6) {
        _matchState.overs = Math.floor(_matchState.overs) + 1;
        // New over — potentially change bowler
        _rotateBowler();
      } else {
        _matchState.overs = Math.floor(_matchState.overs) + overDecimal / 10;
      }
    }

    // Update recent balls
    _matchState.recentBalls.push(outcome);
    if (_matchState.recentBalls.length > 18) {
      _matchState.recentBalls = _matchState.recentBalls.slice(-18);
    }

    // Update run rate
    const totalOvers = Math.floor(_matchState.overs) + (Math.round((_matchState.overs % 1) * 10)) / 6;
    _matchState.runRate = totalOvers > 0 ? Math.round(_matchState.score.runs / totalOvers * 100) / 100 : 0;

    // Handle extras
    if (outcome === 'WD' || outcome === 'NB' || outcome === 'LB') {
      _matchState.extras += 1;
    }

    // Update bowler stats
    if (outcome !== 'WD' && outcome !== 'NB') {
      _matchState.bowler.runs += runs;
    }
    if (outcome === 'W') {
      _matchState.bowler.wickets += 1;
    }

    // Time elapsed
    _matchState.timeElapsed += 0.5; // ~30 sec per ball

    // Check all out or overs done
    if (_matchState.score.wickets >= 10 || _matchState.overs >= 50) {
      _triggerInningsBreak();
    }
  }

  /**
   * Rotate bowler at end of over.
   * @private
   */
  function _rotateBowler() {
    const bowlers = [
      { name: 'M. Starc', overs: '0', maidens: 0, runs: 0, wickets: 0 },
      { name: 'J. Hazlewood', overs: '0', maidens: 0, runs: 0, wickets: 0 },
      { name: 'A. Zampa', overs: '0', maidens: 0, runs: 0, wickets: 0 },
      { name: 'P. Cummins', overs: '0', maidens: 0, runs: 0, wickets: 0 },
      { name: 'G. Maxwell', overs: '0', maidens: 0, runs: 0, wickets: 0 }
    ];
    const current = _matchState.bowler.name;
    const others = bowlers.filter(b => b.name !== current);
    _matchState.bowler = others[Math.floor(Math.random() * others.length)];
    _matchState.bowler.overs = `${Math.floor(Math.random() * 4)}.0`;

    // Rotate strike at end of over
    _matchState.batsmen.forEach(b => b.isStriker = !b.isStriker);
  }

  /**
   * Trigger innings break.
   * @private
   */
  function _triggerInningsBreak() {
    _matchState.phase = 'break';
    _notifyListeners('phaseChange', { phase: 'break', label: 'Innings Break' });
    _notifyListeners('highlight', {
      type: 'break',
      title: '🏏 Innings Break',
      message: `${_matchState.teamBatting} finish with ${_matchState.score.runs}/${_matchState.score.wickets} in ${Math.floor(_matchState.overs)} overs. Run rate: ${_matchState.runRate}.`,
      commentary: 'Time for the innings break! Great time to grab some food or visit the restroom.'
    });
  }

  /* ==========================================
     Listeners
     ========================================== */

  function onEvent(event, callback) {
    _listeners.push({ event, callback });
  }

  function offEvent(event, callback) {
    _listeners = _listeners.filter(l => !(l.event === event && l.callback === callback));
  }

  function _notifyListeners(event, data) {
    _listeners.forEach(l => {
      if (l.event === event) {
        try { l.callback(data); } catch (e) { console.error('[EventEngine]', e); }
      }
    });
  }

  /* ==========================================
     Public Access
     ========================================== */

  function getMatchState() {
    return JSON.parse(JSON.stringify(_matchState));
  }

  function getPhaseSchedule() {
    return [...PHASE_SCHEDULE];
  }

  function getCurrentPhase() {
    return _matchState.phase;
  }

  function isRunning() {
    return _isRunning;
  }

  return Object.freeze({
    start,
    stop,
    onEvent,
    offEvent,
    getMatchState,
    getPhaseSchedule,
    getCurrentPhase,
    isRunning
  });

})();
