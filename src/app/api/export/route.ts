import { NextRequest, NextResponse } from 'next/server';
import { exportToAnkiTxt } from '@/engine/export/ankiExporter';
import { Card } from '@/shared/types';
/**
 * POST /api/export
 *
 * Body : { cards: Card[], deckName?: string }
 * Retourne un fichier .txt tab-separated importable dans Anki.
 */
export async function POST(request: NextRequest) {
  try {
    const { cards, deckName } = (await request.json()) as {
      cards: Card[];
      deckName: string;
    };

    const selected = (cards || []).filter((c) => c.selected);
    if (selected.length === 0) {
      return NextResponse.json({ error: 'Aucune carte sélectionnée' }, { status: 400 });
    }

    const txt = exportToAnkiTxt(selected, deckName);
    const fileName = `${deckName || 'AnkiDocs'}.txt`;

    return new NextResponse(Buffer.from(txt, 'utf-8'), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
