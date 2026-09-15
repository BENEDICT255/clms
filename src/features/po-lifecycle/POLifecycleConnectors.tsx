import React, { useEffect, useState, useCallback } from 'react';
import { POLifecycleTreeData } from '@/infrastructure/repositories/POLifecycleRepository';

export interface POLifecycleConnectorsProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  treeData: POLifecycleTreeData;
}

interface TreePath {
  id: string;
  d: string;
  hasArrow: boolean;
}

/**
 * POLifecycleConnectors
 * Renders SVG connector lines with arrowheads linking:
 * 1. Purchase Order -> Certificates (orthogonal branch tree)
 * 2. Certificates -> Invoices (horizontal connectors)
 * 3. Invoices -> Payments (horizontal / branching connectors)
 */
export const POLifecycleConnectors: React.FC<POLifecycleConnectorsProps> = ({
  containerRef,
  treeData,
}) => {
  const [paths, setPaths] = useState<TreePath[]>([]);

  const calculatePaths = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    // In headless/test environments where dimensions are 0, skip calculation
    if (containerRect.width === 0 && containerRect.height === 0) return;

    const scrollLeft = container.scrollLeft || 0;
    const scrollTop = container.scrollTop || 0;

    const getRelRect = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return null;
      return {
        left: r.left - containerRect.left + scrollLeft,
        right: r.right - containerRect.left + scrollLeft,
        top: r.top - containerRect.top + scrollTop,
        bottom: r.bottom - containerRect.top + scrollTop,
        width: r.width,
        height: r.height,
        centerX: (r.left + r.right) / 2 - containerRect.left + scrollLeft,
        centerY: (r.top + r.bottom) / 2 - containerRect.top + scrollTop,
      };
    };

    const newPaths: TreePath[] = [];

    // 1. PO Node -> Certificates
    const poEl = container.querySelector('[data-node-id="po"]');
    const poRect = getRelRect(poEl);

    if (poRect) {
      const certRects = treeData.certificates
        .map((c) => ({
          id: c.id,
          rect: getRelRect(container.querySelector(`[data-node-id="cert-${c.id}"]`)),
        }))
        .filter(
          (item): item is { id: string; rect: NonNullable<ReturnType<typeof getRelRect>> } =>
            item.rect !== null
        );

      if (certRects.length === 1) {
        const c = certRects[0].rect;
        const startX = poRect.right;
        const startY = poRect.centerY;
        const endX = c.left;
        const endY = c.centerY;

        if (Math.abs(startY - endY) < 3) {
          newPaths.push({
            id: `po-to-cert-${certRects[0].id}`,
            d: `M ${startX} ${startY} L ${endX} ${endY}`,
            hasArrow: true,
          });
        } else {
          const splitX = Math.round((startX + endX) / 2);
          newPaths.push({
            id: `po-to-cert-${certRects[0].id}`,
            d: `M ${startX} ${startY} L ${splitX} ${startY} L ${splitX} ${endY} L ${endX} ${endY}`,
            hasArrow: true,
          });
        }
      } else if (certRects.length > 1) {
        const startX = poRect.right;
        const startY = poRect.centerY;
        const targetMinLeft = Math.min(...certRects.map((c) => c.rect.left));
        const splitX = Math.round((startX + targetMinLeft) / 2);
        const minCertY = Math.min(...certRects.map((c) => c.rect.centerY));
        const maxCertY = Math.max(...certRects.map((c) => c.rect.centerY));

        // Trunk line from PO to splitX
        newPaths.push({
          id: 'po-trunk',
          d: `M ${startX} ${startY} L ${splitX} ${startY}`,
          hasArrow: false,
        });

        // Vertical spine connecting all certificates
        const spineTop = Math.min(minCertY, startY);
        const spineBottom = Math.max(maxCertY, startY);
        newPaths.push({
          id: 'po-spine',
          d: `M ${splitX} ${spineTop} L ${splitX} ${spineBottom}`,
          hasArrow: false,
        });

        // Horizontal spur to each certificate with right-pointing arrow
        certRects.forEach(({ id, rect }) => {
          newPaths.push({
            id: `po-spur-${id}`,
            d: `M ${splitX} ${rect.centerY} L ${rect.left} ${rect.centerY}`,
            hasArrow: true,
          });
        });
      }
    }

    // 2. Certificates -> Invoices
    treeData.certificates.forEach((cert) => {
      const certEl = container.querySelector(`[data-node-id="cert-${cert.id}"]`);
      const certRect = getRelRect(certEl);
      if (!certRect) return;

      const invRects = cert.invoices
        .map((inv) => ({
          id: inv.id,
          rect: getRelRect(container.querySelector(`[data-node-id="inv-${inv.id}"]`)),
        }))
        .filter(
          (item): item is { id: string; rect: NonNullable<ReturnType<typeof getRelRect>> } =>
            item.rect !== null
        );

      if (invRects.length === 1) {
        const inv = invRects[0].rect;
        const startX = certRect.right;
        const startY = certRect.centerY;
        const endX = inv.left;
        const endY = inv.centerY;

        if (Math.abs(startY - endY) < 3) {
          newPaths.push({
            id: `cert-${cert.id}-to-inv-${invRects[0].id}`,
            d: `M ${startX} ${startY} L ${endX} ${endY}`,
            hasArrow: true,
          });
        } else {
          const splitX = Math.round((startX + endX) / 2);
          newPaths.push({
            id: `cert-${cert.id}-to-inv-${invRects[0].id}`,
            d: `M ${startX} ${startY} L ${splitX} ${startY} L ${splitX} ${endY} L ${endX} ${endY}`,
            hasArrow: true,
          });
        }
      } else if (invRects.length > 1) {
        const startX = certRect.right;
        const startY = certRect.centerY;
        const targetMinLeft = Math.min(...invRects.map((i) => i.rect.left));
        const splitX = Math.round((startX + targetMinLeft) / 2);
        const minInvY = Math.min(...invRects.map((i) => i.rect.centerY));
        const maxInvY = Math.max(...invRects.map((i) => i.rect.centerY));

        newPaths.push({
          id: `cert-${cert.id}-trunk`,
          d: `M ${startX} ${startY} L ${splitX} ${startY}`,
          hasArrow: false,
        });
        newPaths.push({
          id: `cert-${cert.id}-spine`,
          d: `M ${splitX} ${Math.min(minInvY, startY)} L ${splitX} ${Math.max(maxInvY, startY)}`,
          hasArrow: false,
        });
        invRects.forEach(({ id, rect }) => {
          newPaths.push({
            id: `cert-${cert.id}-spur-${id}`,
            d: `M ${splitX} ${rect.centerY} L ${rect.left} ${rect.centerY}`,
            hasArrow: true,
          });
        });
      }

      // 3. Invoices -> Payments
      cert.invoices.forEach((inv) => {
        const invEl = container.querySelector(`[data-node-id="inv-${inv.id}"]`);
        const invRect = getRelRect(invEl);
        if (!invRect) return;

        const payRects = inv.payments
          .map((p) => ({
            id: p.id,
            rect: getRelRect(container.querySelector(`[data-node-id="pay-${p.id}"]`)),
          }))
          .filter(
            (item): item is { id: string; rect: NonNullable<ReturnType<typeof getRelRect>> } =>
              item.rect !== null
          );

        if (payRects.length === 1) {
          const p = payRects[0].rect;
          const startX = invRect.right;
          const startY = invRect.centerY;
          const endX = p.left;
          const endY = p.centerY;

          if (Math.abs(startY - endY) < 3) {
            newPaths.push({
              id: `inv-${inv.id}-to-pay-${payRects[0].id}`,
              d: `M ${startX} ${startY} L ${endX} ${endY}`,
              hasArrow: true,
            });
          } else {
            const splitX = Math.round((startX + endX) / 2);
            newPaths.push({
              id: `inv-${inv.id}-to-pay-${payRects[0].id}`,
              d: `M ${startX} ${startY} L ${splitX} ${startY} L ${splitX} ${endY} L ${endX} ${endY}`,
              hasArrow: true,
            });
          }
        } else if (payRects.length > 1) {
          const startX = invRect.right;
          const startY = invRect.centerY;
          const targetMinLeft = Math.min(...payRects.map((p) => p.rect.left));
          const splitX = Math.round((startX + targetMinLeft) / 2);
          const minPayY = Math.min(...payRects.map((p) => p.rect.centerY));
          const maxPayY = Math.max(...payRects.map((p) => p.rect.centerY));

          newPaths.push({
            id: `inv-${inv.id}-trunk`,
            d: `M ${startX} ${startY} L ${splitX} ${startY}`,
            hasArrow: false,
          });
          newPaths.push({
            id: `inv-${inv.id}-spine`,
            d: `M ${splitX} ${minPayY} L ${splitX} ${maxPayY}`,
            hasArrow: false,
          });
          payRects.forEach(({ id, rect }) => {
            newPaths.push({
              id: `inv-${inv.id}-spur-${id}`,
              d: `M ${splitX} ${rect.centerY} L ${rect.left} ${rect.centerY}`,
              hasArrow: true,
            });
          });
        }
      });
    });

    setPaths(newPaths);
  }, [containerRef, treeData]);

  useEffect(() => {
    calculatePaths();

    // Re-evaluate on next animation frame after layout resolves
    const rafId = requestAnimationFrame(() => {
      calculatePaths();
    });

    // Observe container resizes
    const container = containerRef.current;
    let observer: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        calculatePaths();
      });
      observer.observe(container);
    }

    const handleResize = () => calculatePaths();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      if (observer) observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [calculatePaths, containerRef]);

  if (paths.length === 0) return null;

  return (
    <svg
      className="clms-po-lifecycle-svg-overlay"
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <defs>
        <marker
          id="clms-tree-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <polyline
            points="2,1.5 8,5 2,8.5"
            fill="none"
            stroke="#9CA3AF"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      </defs>

      {paths.map((p) => (
        <path
          key={p.id}
          d={p.d}
          className="clms-po-lifecycle-tree-line"
          markerEnd={p.hasArrow ? 'url(#clms-tree-arrow)' : undefined}
        />
      ))}
    </svg>
  );
};
