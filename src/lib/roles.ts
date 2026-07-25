import loupGarou from "@/assets/roles/loup-garou.jpg";
import voyant from "@/assets/roles/voyant.jpg";
import sorciere from "@/assets/roles/sorciere.jpg";
import chasseur from "@/assets/roles/chasseur.jpg";
import cupidon from "@/assets/roles/cupidon.jpg";
import petiteFille from "@/assets/roles/petite-fille.jpg";
import voleur from "@/assets/roles/voleur.jpg";
import villageois from "@/assets/roles/villageois.jpg";
import ancien from "@/assets/roles/ancien.jpg";
import general from "@/assets/roles/general.jpg";
import geolier from "@/assets/roles/geolier.jpg";
import corbeau from "@/assets/roles/corbeau.jpg";
import ange from "@/assets/roles/ange.jpg";
import enfantSauvage from "@/assets/roles/enfant-sauvage.jpg";
import juge from "@/assets/roles/juge.jpg";
import salvateur from "@/assets/roles/salvateur.jpg";
import tavernier from "@/assets/roles/tavernier.jpg";
import idiotVillage from "@/assets/roles/idiot-village.jpg";

export type Team = "village" | "loups" | "solo";
export type RoleId =
  | "loup-garou" | "voyant" | "sorciere" | "chasseur" | "cupidon"
  | "petite-fille" | "voleur" | "villageois" | "ancien" | "general"
  | "geolier" | "corbeau" | "ange" | "enfant-sauvage" | "juge"
  | "salvateur" | "tavernier" | "idiot-village";

export interface Role {
  id: RoleId;
  image: string;
  team: Team;
  order: number; // night wake order
}

export const ROLES: Role[] = [
  { id: "cupidon",        image: cupidon,       team: "village", order: 1 },
  { id: "voleur",         image: voleur,        team: "village", order: 2 },
  { id: "voyant",         image: voyant,        team: "village", order: 3 },
  { id: "corbeau",        image: corbeau,       team: "village", order: 4 },
  { id: "salvateur",      image: salvateur,     team: "village", order: 5 },
  { id: "loup-garou",     image: loupGarou,     team: "loups",   order: 6 },
  { id: "enfant-sauvage", image: enfantSauvage, team: "village", order: 7 },
  { id: "petite-fille",   image: petiteFille,   team: "village", order: 8 },
  { id: "sorciere",       image: sorciere,      team: "village", order: 9 },
  { id: "geolier",        image: geolier,       team: "village", order: 10 },
  { id: "ange",           image: ange,          team: "solo",    order: 11 },
  { id: "chasseur",       image: chasseur,      team: "village", order: 12 },
  { id: "ancien",         image: ancien,        team: "village", order: 13 },
  { id: "general",        image: general,       team: "village", order: 14 },
  { id: "juge",           image: juge,          team: "village", order: 15 },
  { id: "tavernier",      image: tavernier,     team: "village", order: 16 },
  { id: "idiot-village",  image: idiotVillage,  team: "village", order: 17 },
  { id: "villageois",     image: villageois,    team: "village", order: 99 },
];

export const ROLE_MAP: Record<RoleId, Role> = Object.fromEntries(
  ROLES.map((r) => [r.id, r]),
) as Record<RoleId, Role>;
