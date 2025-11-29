import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex justify-between py-2 px-10">
      <h2>Ewuang WEB</h2>
      <Link href="/login" className="text-body">Se connecter</Link>
    </div>
  );
}
