-- Fix: deleting a transfer or goal-contribution transaction was a no-op for
-- balances. The original apply_transaction() trigger short-circuited on those
-- types because their INSERT path is handled by do_transfer/do_goal_contribution
-- RPCs. But on DELETE we still need to reverse the wallet balances (and the
-- goal's current_amount).

create or replace function public.apply_transaction()
returns trigger
language plpgsql
as $$
declare
  v_delta numeric;
begin
  if tg_op = 'INSERT' then
    -- Inserts of transfers / goal contributions are atomic in their RPC, skip.
    if new.type = 'transfer' or new.goal_id is not null then
      return new;
    end if;
    v_delta := case when new.type = 'income' then new.amount else -new.amount end;
    update public.wallets set balance = balance + v_delta where id = new.wallet_id;
    return new;

  elsif tg_op = 'DELETE' then
    if old.type = 'transfer' then
      -- Reverse the transfer: refund source, take back from destination.
      update public.wallets set balance = balance + old.amount where id = old.wallet_id;
      if old.transfer_to_wallet_id is not null then
        update public.wallets set balance = balance - old.amount where id = old.transfer_to_wallet_id;
      end if;
      return old;
    end if;

    if old.goal_id is not null then
      -- Reverse the goal contribution: refund wallet, decrement goal progress.
      update public.wallets set balance = balance + old.amount where id = old.wallet_id;
      update public.goals
        set current_amount = greatest(current_amount - old.amount, 0)
        where id = old.goal_id;
      return old;
    end if;

    -- Regular income/expense delete.
    v_delta := case when old.type = 'income' then -old.amount else old.amount end;
    update public.wallets set balance = balance + v_delta where id = old.wallet_id;
    return old;
  end if;

  return null;
end;
$$;
