import random, time, threading
from app.models.bullying_model   import predict as bully_predict
from app.models.depression_model import predict as dep_predict

# Pool of realistic sample tweets to score through the real models
BULLY_POOL = [
    "nobody wants you here just leave already",
    "you are genuinely the most pathetic person i know",
    "go cry to your mommy loser nobody likes you",
    "you're so ugly inside and out it's embarrassing",
    "everyone talks about how worthless you are behind your back",
    "just disappear already the world would be better",
    "your existence is a waste of space seriously",
    "how does it feel knowing everyone hates you",
    "you will never amount to anything stop trying",
    "freak go back to wherever you came from",
]

DEPRESSION_POOL = [
    "i don't think i can keep doing this anymore",
    "what's even the point of waking up every day",
    "i feel completely empty and hollow inside",
    "nobody would notice if i just vanished",
    "tired of pretending everything is fine when it's not",
    "i don't deserve good things to happen to me",
    "feeling so alone even in a crowded room",
    "maybe they were all right about me all along",
    "i'm so exhausted of existing and feeling this way",
    "some days i just want to stop feeling everything",
]

NEUTRAL_POOL = [
    "just had the best coffee of my life honestly",
    "can't believe it's already thursday where did the week go",
    "working on a new project feeling pretty good about it",
    "finally finished that book took me forever",
    "anyone else think the weather has been weird lately",
]

FAKE_USERS = [
    '@quiet_soul_x', '@shadow_7721', '@lost_echo_',
    '@tired_star99', '@crying_moon_', '@empty_vessel',
    '@sad_chapter_',  '@broken_link9', '@grey_skies__',
    '@fading_light7', '@troll_king99', '@hate_spreader',
    '@anon_darkness', '@cruel_word_s', '@bully_acc_01',
]

class StreamGenerator:
    def __init__(self, socketio):
        self.sio     = socketio
        self.running = False
        self.thread  = None

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread  = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False

    def _loop(self):
        while self.running:
            try:
                self._emit_one()
            except Exception as e:
                print(f"[stream] error: {e}")
            time.sleep(random.uniform(1.8, 3.5))

    def _emit_one(self):
        # Pick a tweet with weighted randomness
        roll = random.random()
        if roll < 0.38:
            text    = random.choice(BULLY_POOL)
            hint    = 'bullying'
        elif roll < 0.70:
            text    = random.choice(DEPRESSION_POOL)
            hint    = 'depression'
        else:
            text    = random.choice(NEUTRAL_POOL)
            hint    = 'neutral'

        b_res = bully_predict(text)
        d_res = dep_predict(text)

        b_score = b_res['score']
        d_score = d_res['score']

        if b_score > 0.55 and b_score >= d_score:
            detected = 'bullying'
            score    = b_score
        elif d_score > 0.45:
            detected = 'depression'
            score    = d_score
        else:
            detected = 'neutral'
            score    = max(b_score, d_score)

        payload = {
            'id':               random.randint(100000, 999999),
            'user':             random.choice(FAKE_USERS),
            'text':             text,
            'type':             detected,
            'bullying_score':   round(b_score, 3),
            'depression_score': round(d_score, 3),
            'score':            round(score, 3),
            'time':             'now',
            'bullying_type':    b_res.get('type', ''),
            'models_used':      'XGBoost' if b_res.get('ready') else 'fallback',
        }
        self.sio.emit('new_tweet', payload)

# Singleton — created in routes/stream.py
_generator = None

def get_generator(socketio):
    global _generator
    if _generator is None:
        _generator = StreamGenerator(socketio)
    return _generator