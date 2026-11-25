import { redirect } from "next/navigation";

/** Legacy path → wishlist Dig List */
export default function CollezioneRedirect() {
  redirect("/wishlist");
}
