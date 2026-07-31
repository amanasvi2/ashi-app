import { useEffect, useState } from 'react';
import type { CustomReward, CoinsState } from '../types';
import { loadCoins, spendCoins, addHintTokens, loadCustomRewards } from '../storage';
import { LoadingScreen } from '../components/LoadingScreen';

const HINT_COST = 25;
const HINT_AMOUNT = 10;

function IconCoin({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
function IconHint() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.75V17h8v-2.25A7 7 0 0 0 12 2z"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function CoinDisplay({ balance }: { balance: number }) {
  return (
    <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Your coins</p>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-5xl font-bold text-ink">{balance}</span>
        <span className="text-accent mb-1.5"><IconCoin size={22} /></span>
      </div>
      <p className="text-xs text-muted mt-1">
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
    <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-5">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-[4px] bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
          <IconHint />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink">Hint Tokens</p>
          <p className="text-xs text-muted mt-0.5">
            Use during practice to see the answer choices.
          </p>
          {hintTokens > 0 && (
            <p className="text-xs text-ink font-medium mt-1">
              You have {hintTokens} token{hintTokens !== 1 ? 's' : ''} ready
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="flex items-center justify-end gap-1 text-xs font-bold text-ink"><IconCoin />{HINT_COST}</p>
          <p className="text-[10px] text-muted">for {HINT_AMOUNT} hints</p>
        </div>
      </div>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          disabled={!canAfford}
          className={`mt-4 w-full py-2.5 rounded-[4px] text-sm font-semibold transition-colors
            ${canAfford
              ? 'bg-accent text-white hover:bg-accent-hover'
              : 'bg-rule/40 text-muted cursor-not-allowed'}`}
        >
          {canAfford ? `Buy ${HINT_AMOUNT} hints` : `Need ${HINT_COST - coinBalance} more coins`}
        </button>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="flex items-center justify-center gap-1 text-xs text-muted">
            Spend <IconCoin /> {HINT_COST} for {HINT_AMOUNT} hint tokens?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-2.5 rounded-[4px] text-sm font-semibold border border-rule text-ink hover:bg-paper"
            >
              Not now
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-[4px] text-sm font-semibold bg-accent text-white hover:bg-accent-hover"
            >
              Yes, buy
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
    <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-5">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-[4px] bg-rule/40 flex items-center justify-center text-2xl flex-shrink-0">
          {reward.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{reward.label}</p>
          {unlocked ? (
            <p className="text-xs text-ink font-medium mt-0.5">Unlocked</p>
          ) : (
            <p className="text-xs text-muted mt-0.5">YouTube video</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          {unlocked ? (
            <span className="text-ink"><IconCheck /></span>
          ) : (
            <>
              <p className="flex items-center justify-end gap-1 text-xs font-bold text-ink"><IconCoin />{reward.cost}</p>
              <p className="text-[10px] text-muted">coins</p>
            </>
          )}
        </div>
      </div>

      {unlocked ? (
        <a
          href={reward.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full py-2.5 rounded-[4px] text-sm font-semibold bg-accent text-white
                     hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
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
          className={`mt-4 w-full py-2.5 rounded-[4px] text-sm font-semibold transition-colors
            ${canAfford
              ? 'bg-accent text-white hover:bg-accent-hover'
              : 'bg-rule/40 text-muted cursor-not-allowed'}`}
        >
          {canAfford ? 'Unlock' : `Need ${reward.cost - coinBalance} more coins`}
        </button>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="flex items-center justify-center gap-1 text-xs text-muted">
            Spend <IconCoin /> {reward.cost} to unlock "{reward.label}"?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-2.5 rounded-[4px] text-sm font-semibold border border-rule text-ink hover:bg-paper"
            >
              Not now
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-[4px] text-sm font-semibold bg-accent text-white hover:bg-accent-hover"
            >
              Yes, unlock
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
    <div className="min-h-screen bg-paper pb-24 lg:pb-8">
      <div className="max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-5">

        <div>
          <h1 className="text-xl font-bold text-ink">Rewards</h1>
          <p className="text-xs text-muted mt-0.5">Spend your coins on something fun</p>
        </div>

        <CoinDisplay balance={coins.balance} />

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Hint tokens</h2>
          <HintCard
            hintTokens={coins.hintTokens}
            coinBalance={coins.balance}
            onBuy={handleBuyHints}
          />
        </section>

        {customRewards.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Video rewards</h2>
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
          <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-8 text-center">
            <p className="text-muted text-sm">No video rewards yet.</p>
            <p className="text-muted text-xs mt-1">Ask your parent to add some!</p>
          </div>
        )}

        <div className="bg-surface rounded-[4px] border border-rule p-4 text-xs text-ink space-y-1.5">
          <p className="font-semibold">How to earn coins:</p>
          <ul className="space-y-1 text-muted">
            <li className="flex items-center gap-1.5">Extra sessions beyond your daily goal <IconCoin size={11} /> 10 coins</li>
            <li className="flex items-center gap-1.5">Perfect score on a session <IconCoin size={11} /> 5 bonus coins</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
