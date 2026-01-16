import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScanLine, Camera, X } from 'lucide-react';

interface QRScannerProps {
  onScan: (result: string) => void;
  className?: string; // Allow custom styling
}

export function QRScanner({ onScan, className }: QRScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader';

  const startScanning = async () => {
    setError(null);

    try {
      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Extract PIN from URL or use as-is
          let pin = decodedText;
          try {
            const url = new URL(decodedText);
            const pinParam = url.searchParams.get('pin');
            if (pinParam) {
              pin = pinParam;
            } else {
              // Check if path contains /join/PIN
              const pathParts = url.pathname.split('/');
              const joinIndex = pathParts.indexOf('join');
              if (joinIndex !== -1 && pathParts[joinIndex + 1]) {
                pin = pathParts[joinIndex + 1];
              }
            }
          } catch {
            // Not a URL, use as-is (might be just a PIN)
          }

          stopScanning();
          setIsOpen(false);
          onScan(pin);
        },
        () => {
          // QR code not detected in frame - ignore
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Failed to start scanner:', err);
      setError('Could not access camera. Please ensure camera permissions are granted.');
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startScanning();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={`gap-2 ${className || ''}`}>
          <ScanLine className="h-4 w-4" />
          Scan QR
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            id={scannerContainerId}
            className="w-full aspect-square bg-muted rounded-lg overflow-hidden"
          />

          {error && (
            <div className="text-sm text-destructive text-center p-3 bg-destructive/10 rounded-lg">
              {error}
            </div>
          )}

          {!isScanning && !error && (
            <div className="text-sm text-muted-foreground text-center">
              Starting camera...
            </div>
          )}

          {isScanning && (
            <p className="text-sm text-muted-foreground text-center">
              Point your camera at the quiz QR code
            </p>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}