import { useEffect, useState } from 'react';
import type { CustomReward, CoinsState } from '../types';
import { loadCoins, spendCoins, addHintTokens, loadCustomRewards } from '../storage';
import { LoadingScreen } from '../components/LoadingScreen';

const HINT_COST = 25;
const HINT_AMOUNT = 10;

function CoinDisplay({ balance }: { balance: number }) {
  return (
    <div className="bg-gradient-to-r from-amber-400 to-yellow-400 rounded-2xl p-5 text-white">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-100">Your coins</p>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-5xl font-bold">{balance}</span>
        <span className="text-xl mb-1">⭐</span>
      </div>
      <p className="text-xs text-amber-100 mt-1">
        Earn coins by doing extra practice sessions beyond your daily goal.
      </p>
    </div>
  );
}

interface HintCardProps {
  hintTokens: number;
  coinBalance: number;
  onBuy: () => void;
}

function HintCard({ hintTokens, coinBalance, onBuy }: HintCardProps) {
  const [confirming, setConfirming] = useState(false);
  const canAfford = coinBalance >= HINT_COST;

  const handleConfirm = () => {
    onBuy();
    setConfirming(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl flex-shrink-0">
          🔮
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">Hint Tokens</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Use during practice to see the answer choices.
          </p>
          {hintTokens > 0 && (
            <p className="text-xs text-blue-600 font-medium mt-1">
              You have {hintTokens} token{hintTokens !== 1 ? 's' : ''} ready
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-bold text-amber-600">⭐ {HINT_COST}</p>
          <p className="text-[10px] text-slate-400">for {HINT_AMOUNT} hints</p>
        </div>
      </div>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          disabled={!canAfford}
          className={`mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors
            ${canAfford
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
        >
          {canAfford ? `Buy ${HINT_AMOUNT} hints` : `Need ${HINT_COST - coinBalance} more coins`}
        </button>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-center text-slate-600">
            Spend ⭐ {HINT_COST} for {HINT_AMOUNT} hint tokens?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Not now
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
            >
              Yes, buy!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface RewardCardProps {
  reward: CustomReward;
  coinBalance: number;
  onRedeem: (reward: CustomReward) => void;
}

function RewardCard({ reward, coinBalance, onRedeem }: RewardCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const canAfford = coinBalance >= reward.cost;

  const handleConfirm = () => {
    onRedeem(reward);
    setUnlocked(true);
    setConfirming(false);
  };

  return (
    <div className={`bg-white rounded-2xl border p-5 transition-all ${unlocked ? 'border-emerald-200' : 'border-slate-100'}`}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl flex-shrink-0">
          {reward.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{reward.label}</p>
          {unlocked ? (
            <p className="text-xs text-emerald-600 font-medium mt-0.5">Unlocked!</p>
          ) : (
            <p className="text-xs text-slate-500 mt-0.5">YouTube video</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          {unlocked ? (
            <span className="text-xl">✓</span>
          ) : (
            <>
              <p className="text-xs font-bold text-amber-600">⭐ {reward.cost}</p>
              <p className="text-[10px] text-slate-400">coins</p>
            </>
          )}
        </div>
      </div>

      {unlocked ? (
        <a
          href={reward.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white
                     hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Watch video
        </a>
      ) : !confirming ? (
        <button
          onClick={() => setConfirming(true)}
          disabled={!canAfford}
          className={`mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors
            ${canAfford
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
        >
          {canAfford ? 'Unlock' : `Need ${reward.cost - coinBalance} more coins`}
        </button>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-center text-slate-600">
            Spend ⭐ {reward.cost} to unlock "{reward.label}"?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Not now
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
            >
              Yes, unlock!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RewardsPage() {
  const [loading, setLoading] = useState(true);
  const [coins, setCoins] = useState<CoinsState>({ balance: 0, totalEarned: 0, hintTokens: 0 });
  const [customRewards, setCustomRewards] = useState<CustomReward[]>([]);

  useEffect(() => {
    (async () => {
      const [c, r] = await Promise.all([loadCoins(), loadCustomRewards()]);
      setCoins(c); setCustomRewards(r);
      setLoading(false);
    })();
  }, []);

  const handleBuyHints = async () => {
    const next = await spendCoins(HINT_COST);
    if (!next) return;
    await addHintTokens(HINT_AMOUNT);
    setCoins({ ...next, hintTokens: next.hintTokens + HINT_AMOUNT });
  };

  const handleRedeemReward = async (reward: CustomReward) => {
    const next = await spendCoins(reward.cost);
    if (!next) return;
    setCoins(next);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-8">
      <div className="max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-5">

        <div>
          <h1 className="text-xl font-bold text-slate-900">Rewards</h1>
          <p className="text-xs text-slate-400 mt-0.5">Spend your coins on something fun</p>
        </div>

        <CoinDisplay balance={coins.balance} />

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Hint tokens</h2>
          <HintCard
            hintTokens={coins.hintTokens}
            coinBalance={coins.balance}
            onBuy={handleBuyHints}
          />
        </section>

        {customRewards.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Video rewards</h2>
            {customRewards.map(reward => (
              <RewardCard
                key={reward.id}
                reward={reward}
                coinBalance={coins.balance}
                onRedeem={handleRedeemReward}
              />
            ))}
          </section>
        )}

        {customRewards.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <p className="text-slate-400 text-sm">No video rewards yet.</p>
            <p className="text-slate-400 text-xs mt-1">Ask your parent to add some!</p>
          </div>
        )}

        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4 text-xs text-blue-700 space-y-1">
          <p className="font-semibold">How to earn coins:</p>
          <ul className="space-y-0.5 text-blue-600">
            <li>• Extra sessions beyond your daily goal → ⭐ 10 coins</li>
            <li>• Perfect score on a session → ⭐ 5 bonus coins</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
