"use client";

import type { ShortUrlFormData } from "@/lib/short-urls/types";
import { Modal } from "@/components/ui/modal";
import { FormType, UrlForm } from "@/components/forms/url-form";
import QRCodeEditor from "@/components/shared/qr";

import type { UrlListViewer } from "./url-list.types";

interface UrlListModalsProps {
  user: UrlListViewer;
  selectedUrl: ShortUrlFormData | null;
  isShowQrcode: boolean;
  setShowQrcode: (value: boolean) => void;
  isShowForm: boolean;
  setShowForm: (value: boolean) => void;
  formType: FormType;
  currentEditUrl: ShortUrlFormData | null;
  action: string;
  onRefresh: () => void;
  title: {
    qrCode: string;
    add: string;
    edit: string;
  };
}

export function UrlListModals({
  user,
  selectedUrl,
  isShowQrcode,
  setShowQrcode,
  isShowForm,
  setShowForm,
  formType,
  currentEditUrl,
  action,
  onRefresh,
  title,
}: UrlListModalsProps) {
  return (
    <>
      <Modal
        className="md:max-w-lg"
        showModal={isShowQrcode}
        setShowModal={setShowQrcode}
        title={selectedUrl ? `QR code for ${selectedUrl.url}` : title.qrCode}
      >
        {selectedUrl ? (
          <QRCodeEditor
            user={{ id: user.id, apiKey: user.apiKey, team: user.team }}
            url={`https://${selectedUrl.prefix}/${selectedUrl.url}`}
          />
        ) : null}
      </Modal>

      <Modal
        className="md:max-w-2xl"
        showModal={isShowForm}
        setShowModal={setShowForm}
        title={formType === "add" ? title.add : title.edit}
      >
        <UrlForm
          user={{ id: user.id, name: user.name, role: user.role }}
          isShowForm={isShowForm}
          setShowForm={setShowForm}
          type={formType}
          initData={currentEditUrl}
          action={action}
          onRefresh={onRefresh}
        />
      </Modal>
    </>
  );
}
