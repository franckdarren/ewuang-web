'use client';

import { useState } from 'react';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function InactivityGuard({ children }: { children: React.ReactNode }) {
    const [showWarning, setShowWarning] = useState(false);

    const { stayConnected, logout } = useInactivityLogout({
        onWarning: () => setShowWarning(true),
        onDismissWarning: () => setShowWarning(false),
    });

    return (
        <>
            {children}

            <Dialog open={showWarning}>
                <DialogContent
                    className="sm:max-w-md"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>Session sur le point d&apos;expirer</DialogTitle>
                        <DialogDescription>
                            Vous serez automatiquement déconnecté dans{' '}
                            <strong>2 minutes</strong> en raison d&apos;une inactivité
                            prolongée. Voulez-vous rester connecté ?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowWarning(false);
                                logout();
                            }}
                        >
                            Se déconnecter
                        </Button>
                        <Button
                            onClick={() => {
                                setShowWarning(false);
                                stayConnected();
                            }}
                        >
                            Rester connecté
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
