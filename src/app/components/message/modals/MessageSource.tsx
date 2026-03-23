import { MouseEvent } from 'react';
import { Room, MatrixEvent } from '$types/matrix-sdk';
import { useSetAtom } from 'jotai';
import { MenuItem, Icon, Icons, Text } from 'folds';
import { TextViewer } from '$components/text-viewer';
import { getEventEdits } from '$utils/room';
import { modalAtom, ModalType } from '$state/modal';
import * as css from '$features/room/message/styles.css';

function getEventSource(room: Room, mEvent: MatrixEvent): object {
  const getContent = (evt: MatrixEvent) =>
    evt.isEncrypted()
      ? {
          [`<== DECRYPTED_EVENT ==>`]: evt.getEffectiveEvent(),
          [`<== ORIGINAL_EVENT ==>`]: evt.event,
        }
      : evt.event;

  const evtId = mEvent.getId()!;
  const evtTimeline = room.getTimelineForEvent(evtId);
  const edits =
    evtTimeline &&
    getEventEdits(evtTimeline.getTimelineSet(), evtId, mEvent.getType())?.getRelations();

  if (!edits) return getContent(mEvent);

  const content: Record<string, unknown> = {
    '<== MAIN_EVENT ==>': getContent(mEvent),
  };

  edits.forEach((editEvt, index) => {
    content[`<== REPLACEMENT_EVENT_${index + 1} ==>`] = getContent(editEvt);
  });

  return content;
}

export function MessageSourceCodeItem({ room, mEvent }: { room: Room; mEvent: MatrixEvent }) {
  const setModal = useSetAtom(modalAtom);

  return (
    <MenuItem
      size="300"
      after={<Icon size="100" src={Icons.BlockCode} />}
      radii="300"
      onClick={(e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setModal({
          type: ModalType.Source,
          data: getEventSource(room, mEvent),
        });
      }}
    >
      <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
        View Source
      </Text>
    </MenuItem>
  );
}

function sortObject<T extends Record<any, any>>(o: T): T {
  const sorted = {};
  // eslint-disable-next-line no-restricted-syntax
  for (const key of Object.keys(o)) {
    // @ts-ignore
    sorted[key] = o[key];
  }
  return sorted as T;
}

function deepEquals(left: any, right: any) {
  switch (typeof left) {
    case 'object':
      if (typeof right === 'object') {
        const found: Record<string, boolean> = {};
        // eslint-disable-next-line no-restricted-syntax
        for (const [key, value] of Object.entries(left)) {
          if (!deepEquals(right[key], value)) return false;
          found[key] = true;
        }
        // eslint-disable-next-line no-restricted-syntax
        for (const key of Object.keys(right)) {
          if (!found[key]) return false;
        }
        return true;
      }
      break;
    default:
      return left === right;
  }
}

function compareKey(key: string, left: any, right: any) {
  if (deepEquals(left, right)) {
    return {};
  }
  if (typeof left === 'object' && typeof right === 'object') {
    if (left instanceof Array && right instanceof Array) {
      // naïve, but should work well
      const mutableRight = [...right];
      for (const item of left) {
        
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return { [key]: compare(left, right) };
  }
  return { [`-${key}`]: left, [`+${key}`]: right };
}

// requires input objects to be sorted
function compare(left: object, right: object): object {
  const out = {};
  const rightKeys = Object.keys(right);
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of Object.entries(left)) {
    if (key in right) {
      let rightKey;
      // eslint-disable-next-line no-cond-assign
      while (key !== (rightKey = rightKeys.shift())) {
        // @ts-ignore
        out[`+${rightKey}`] = right[rightKey];
      }
      // @ts-ignore
      Object.assign(out, compareKey(key, value, right[key]));
    } else {
      // @ts-ignore
      out[`-${key}`] = value;
    }
  }
  // check for slippage
  // eslint-disable-next-line no-restricted-syntax
  for (const key of rightKeys) {
    // @ts-ignore
    out[`+${key}`] = right[key];
  }
  return out;
}

export function MessageDiffItem({ mEvent }: { mEvent: MatrixEvent }) {
  const setModal = useSetAtom(modalAtom);

  return (
    <MenuItem
      size="300"
      after={<Icon size="100" src={Icons.Filter} />}
      radii="300"
      onClick={(e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setModal({
          type: ModalType.Source,
          data: compare(
            sortObject(mEvent.getUnsigned().prev_content ?? {}),
            sortObject(mEvent.getContent())
          ),
        });
      }}
    >
      <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
        Compare
      </Text>
    </MenuItem>
  );
}

type MessageSourceInternalProps = {
  name: string;
  data: object;
  onClose: () => void;
};

export function MessageSourceInternal({ name, data, onClose }: MessageSourceInternalProps) {
  return (
    <TextViewer
      name="Source Code"
      langName="json"
      text={JSON.stringify(data, null, 2)}
      requestClose={onClose}
    />
  );
}
