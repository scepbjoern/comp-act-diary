/**
 * Beta page for location details.
 * This is a placeholder page for search result navigation.
 */
import { getPrisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { IconMapPin, IconArrowLeft } from '@tabler/icons-react';

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('userId')?.value || null;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function LocationDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const userId = await getUserId();
  
  if (!userId) {
    return (
      <div className="text-center py-8">
        <p className="text-error">Nicht authentifiziert</p>
      </div>
    );
  }

  const prisma = getPrisma();
  const location = await prisma.location.findFirst({
    where: { slug, userId },
  });

  if (!location) {
    return (
      <div className="text-center py-8">
        <p className="text-error">Ort nicht gefunden</p>
        <Link href="/" className="btn btn-ghost mt-4">
          <IconArrowLeft size={18} />
          Zurück zur Startseite
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Beta badge */}
      <div className="badge badge-warning mb-4">Beta</div>
      
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-base-300 flex items-center justify-center">
          <IconMapPin size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{location.name}</h1>
          {location.city && (
            <p className="text-base-content/60">{location.city}</p>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="card bg-base-200">
        <div className="card-body">
          {location.address && (
            <div>
              <span className="text-sm text-base-content/60">Adresse</span>
              <p>{location.address}</p>
            </div>
          )}
          {location.notes && (
            <div className="mt-4">
              <span className="text-sm text-base-content/60">Notizen</span>
              <p className="whitespace-pre-wrap">{location.notes}</p>
            </div>
          )}
          {location.lat && location.lng && (
            <div className="mt-4">
              <span className="text-sm text-base-content/60">Koordinaten</span>
              <p>{location.lat}, {location.lng}</p>
            </div>
          )}
        </div>
      </div>

      {/* Back link */}
      <div className="mt-6">
        <Link href="/" className="btn btn-ghost">
          <IconArrowLeft size={18} />
          Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
}
