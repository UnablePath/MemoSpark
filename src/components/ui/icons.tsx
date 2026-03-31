"use client";

import type React from 'react';

import {
  ArrowsOut as PhExpand,
  ArrowArcLeft as PhUndo,
  ArrowClockwise as PhRefreshCw,
  ArrowCounterClockwise as PhRotateCcw,
  ArrowDown as PhArrowDown,
  ArrowDownLeft as PhArrowDownLeft,
  ArrowDownRight as PhArrowDownRight,
  ArrowLeft as PhArrowLeft,
  ArrowRight as PhArrowRight,
  ArrowSquareDown as PhArrowDownToLine,
  ArrowSquareUp as PhArrowUpToLine,
  ArrowUp as PhArrowUp,
  ArrowUpLeft as PhArrowUpLeft,
  ArrowUpRight as PhArrowUpRight,
  At as PhAtSign,
  Atom as PhAtom,
  Backpack as PhPackage,
  Barbell as PhDumbbell,
  Bell as PhBell,
  BellSlash as PhBellOff,
  Book as PhBook,
  BookOpen as PhBookOpen,
  BookOpenText as PhBookText,
  Brain as PhBrain,
  Briefcase as PhBriefcase,
  CalendarBlank as PhCalendar,
  Camera as PhCamera,
  CaretCircleDown as PhChevronDown,
  CaretCircleLeft as PhChevronLeft,
  CaretCircleRight as PhChevronRight,
  CaretCircleUp as PhChevronUp,
  ChartPie as PhPieChart,
  Check as PhCheck,
  CheckCircle as PhCheckCircle,
  Checks as PhCheckCheck,
  CircleNotch as PhLoader2,
  Clock as PhClock,
  ClockCounterClockwise as PhHistory,
  Code as PhCode,
  Coffee as PhCoffee,
  Copy as PhCopy,
  Coins as PhCoins,
  Command as PhCommand,
  CreditCard as PhCreditCard,
  Crown as PhCrown,
  Database as PhDatabase,
  DeviceMobile as PhSmartphone,
  Download as PhDownload,
  DotsThree as PhMoreHorizontal,
  DotsThreeVertical as PhMoreVertical,
  EnvelopeSimple as PhMail,
  Eye as PhEye,
  EyeSlash as PhEyeOff,
  File as PhFile,
  FileArrowDown as PhFileDown,
  FileText as PhFileText,
  FilmSlate as PhFilm,
  Fire as PhFlame,
  Flag as PhFlag,
  FloppyDisk as PhSave,
  Funnel as PhFilter,
  GameController as PhGamepad2,
  Gauge as PhGauge,
  Gift as PhGift,
  Globe as PhGlobe,
  GraduationCap as PhGraduationCap,
  Hash as PhTag,
  Headphones as PhMusic,
  Heart as PhHeart,
  House as PhHome,
  Image as PhImage,
  Info as PhInfo,
  Keyboard as PhKeyboard,
  Laptop as PhLaptop,
  Leaf as PhLeaf,
  Lightning as PhZap,
  Lightbulb as PhLightbulb,
  Link as PhLink,
  List as PhList,
  ListBullets as PhLayoutList,
  ListChecks as PhListTodo,
  Lock as PhLock,
  LockKeyOpen as PhUnlock,
  MagicWand as PhWand2,
  MagnifyingGlass as PhSearch,
  MapTrifold as PhMap,
  MapPin as PhMapPin,
  Medal as PhMedal,
  Microphone as PhMic,
  MicrophoneSlash as PhMicOff,
  Monitor as PhMonitor,
  Moon as PhMoon,
  MusicNotesSimple as PhVolume2,
  NavigationArrow as PhSend,
  PaperPlaneRight as PhReply,
  Paperclip as PhPaperclip,
  Pause as PhPause,
  Pencil as PhPencil,
  Pizza as PhPizza,
  Play as PhPlay,
  Plus as PhPlus,
  PlusCircle as PhPlusCircle,
  PresentationChart as PhPresentation,
  Prohibit as PhBan,
  Pulse as PhActivity,
  Question as PhHelpCircle,
  Repeat as PhRepeat,
  RepeatOnce as PhRepeat2,
  RocketLaunch as PhRocket,
  Rss as PhRss,
  Share as PhShare,
  ShieldCheck as PhShield,
  ShoppingCartSimple as PhShoppingCart,
  SignOut as PhLogOut,
  SkipForward as PhSkipForward,
  Smiley as PhSmile,
  SortAscending as PhSortAsc,
  SquaresFour as PhGrid3X3,
  Star as PhStar,
  Sun as PhSun,
  Table as PhTable,
  Target as PhTarget,
  TestTube as PhTestTube,
  ThumbsDown as PhThumbsDown,
  ThumbsUp as PhThumbsUp,
  Timer as PhTimer,
  Trash as PhTrash,
  Trophy as PhTrophy,
  Upload as PhUpload,
  User as PhUser,
  UserMinus as PhUserMinus,
  UserPlus as PhUserPlus,
  Users as PhUsers,
  VideoCamera as PhVideo,
  Warning as PhAlertTriangle,
  WarningCircle as PhAlertCircle,
  WarningOctagon as PhAlert,
  WifiHigh as PhWifi,
  WifiSlash as PhWifiOff,
  Wind as PhWind,
  Wrench as PhSettings,
  X as PhX,
  XCircle as PhXCircle,
  type IconProps as PhosphorIconProps,
} from "@phosphor-icons/react";

import {
  IconBrandFacebook,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconBrandWhatsapp,
  IconChartBar,
  IconChartLine,
  IconCircle,
  IconMessage,
  IconMessageCircle,
  IconPalette,
  IconShare2,
  IconShoppingCart,
  IconSquare,
  IconVolumeOff,
} from "@tabler/icons-react";
import type { IconProps as TablerIconProps } from "@tabler/icons-react";

import { DollarCircle as IoDollarSign } from "iconoir-react";
import { ArrowTrendingDownIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import { SparklesIcon } from "hugeicons-react";
import type { HugeiconsIconProps } from "@hugeicons/react";

export type Icon = React.ComponentType<PhosphorIconProps>;
export type LucideIcon = Icon;

function withPhosphorDefaults(Comp: React.ComponentType<PhosphorIconProps>): Icon {
  const Wrapped = (props: PhosphorIconProps) => <Comp weight="duotone" {...props} />;
  Wrapped.displayName = `PhosphorIcon(${Comp.displayName ?? Comp.name ?? "Icon"})`;
  return Wrapped;
}

function withTablerDefaults(Comp: React.ComponentType<TablerIconProps>): Icon {
  const Wrapped = (props: PhosphorIconProps) => (
    <Comp stroke={1.9} {...(props as unknown as TablerIconProps)} />
  );
  Wrapped.displayName = `TablerIcon(${Comp.displayName ?? Comp.name ?? "Icon"})`;
  return Wrapped;
}

function withHugeIcon(Comp: React.ComponentType<Omit<HugeiconsIconProps, "icon">>): Icon {
  const Wrapped = (props: PhosphorIconProps) => <Comp {...(props as unknown as Omit<HugeiconsIconProps, "icon">)} />;
  Wrapped.displayName = `HugeIcon(${Comp.displayName ?? "Icon"})`;
  return Wrapped;
}

function withHeroOutline(
  Comp: React.ComponentType<React.ComponentProps<typeof ArrowTrendingUpIcon>>,
): Icon {
  const Wrapped = (props: PhosphorIconProps) => (
    <Comp {...(props as unknown as React.ComponentProps<typeof ArrowTrendingUpIcon>)} />
  );
  Wrapped.displayName = `HeroOutline(${Comp.displayName ?? "Icon"})`;
  return Wrapped;
}

export const ICON_CLASSNAMES = {
  sm: 'h-4 w-4 shrink-0',
  md: 'h-5 w-5 shrink-0',
  lg: 'h-6 w-6 shrink-0',
} as const;

export function iconClassName(
  size: keyof typeof ICON_CLASSNAMES = 'md',
  className?: string,
) {
  return className ? `${ICON_CLASSNAMES[size]} ${className}` : ICON_CLASSNAMES[size];
}

// Canonical MemoSpark icon exports (keep these stable; swap internals freely).
export const Logo = withPhosphorDefaults(PhCommand);
export const Spinner = withPhosphorDefaults(PhLoader2);
export const Close = withPhosphorDefaults(PhX);
export const Add = withPhosphorDefaults(PhPlus);
export const TrashIcon = withPhosphorDefaults(PhTrash);
export const CheckIcon = withPhosphorDefaults(PhCheck);
export const Sun = withPhosphorDefaults(PhSun);
export const MoonIcon = withPhosphorDefaults(PhMoon);
export const LaptopIcon = withPhosphorDefaults(PhLaptop);
export const UserIcon = withPhosphorDefaults(PhUser);
export const ArrowRightIcon = withPhosphorDefaults(PhArrowRight);
export const ChevronLeftIcon = withPhosphorDefaults(PhChevronLeft);
export const ChevronRightIcon = withPhosphorDefaults(PhChevronRight);
export const Help = withPhosphorDefaults(PhHelpCircle);
export const PizzaIcon = withPhosphorDefaults(PhPizza);
export const SettingsIcon = withPhosphorDefaults(PhSettings);
export const Warning = withPhosphorDefaults(PhAlertTriangle);
export const More = withPhosphorDefaults(PhMoreVertical);
export const CreditCardIcon = withPhosphorDefaults(PhCreditCard);
export const FileIcon = withPhosphorDefaults(PhFile);
export const FileTextIcon = withPhosphorDefaults(PhFileText);
export const ImageIcon = withPhosphorDefaults(PhImage);

// Lucide compatibility layer (so we can swap imports repo-wide without touching JSX usage).
export const Activity = withPhosphorDefaults(PhActivity);
export const Alert = withPhosphorDefaults(PhAlert);
export const AlertCircle = withPhosphorDefaults(PhAlertCircle);
export const AlertTriangle = withPhosphorDefaults(PhAlertTriangle);
export const ArrowDown = withPhosphorDefaults(PhArrowDown);
export const ArrowLeft = withPhosphorDefaults(PhArrowLeft);
export const ArrowRight = withPhosphorDefaults(PhArrowRight);
export const ArrowUp = withPhosphorDefaults(PhArrowUp);
export const ArrowDownToLine = withPhosphorDefaults(PhArrowDownToLine);
export const ArrowUpToLine = withPhosphorDefaults(PhArrowUpToLine);
export const AtSign = withPhosphorDefaults(PhAtSign);
export const Atom = withPhosphorDefaults(PhAtom);
export const Award = withPhosphorDefaults(PhMedal);
export const Ban = withPhosphorDefaults(PhBan);
export const BarChart3 = withTablerDefaults(IconChartBar);
export const Bell = withPhosphorDefaults(PhBell);
export const BellOff = withPhosphorDefaults(PhBellOff);
export const Book = withPhosphorDefaults(PhBook);
export const BookOpen = withPhosphorDefaults(PhBookOpen);
export const BookText = withPhosphorDefaults(PhBookText);
export const Brain = withPhosphorDefaults(PhBrain);
export const BrainCircuit = withPhosphorDefaults(PhBrain);
export const Briefcase = withPhosphorDefaults(PhBriefcase);
export const Calendar = withPhosphorDefaults(PhCalendar);
export const CalendarIcon = withPhosphorDefaults(PhCalendar);
export const Camera = withPhosphorDefaults(PhCamera);
export const Check = withPhosphorDefaults(PhCheck);
export const CheckCircle = withPhosphorDefaults(PhCheckCircle);
export const CheckCircle2 = withPhosphorDefaults(PhCheckCircle);
export const CheckCheck = withPhosphorDefaults(PhCheckCheck);
export const ChevronDown = withPhosphorDefaults(PhChevronDown);
export const ChevronLeft = withPhosphorDefaults(PhChevronLeft);
export const ChevronRight = withPhosphorDefaults(PhChevronRight);
export const ChevronUp = withPhosphorDefaults(PhChevronUp);
export const Circle = withTablerDefaults(IconCircle);
export const Clock = withPhosphorDefaults(PhClock);
export const Code = withPhosphorDefaults(PhCode);
export const Coffee = withPhosphorDefaults(PhCoffee);
export const Coins = withPhosphorDefaults(PhCoins);
export const Copy = withPhosphorDefaults(PhCopy);
export const Command = withPhosphorDefaults(PhCommand);
export const CreditCard = withPhosphorDefaults(PhCreditCard);
export const Crown = withPhosphorDefaults(PhCrown);
export const Database = withPhosphorDefaults(PhDatabase);
export const DollarSign = (props: React.SVGProps<SVGSVGElement>) => <IoDollarSign {...props} />;
export const Download = withPhosphorDefaults(PhDownload);
export const Dumbbell = withPhosphorDefaults(PhDumbbell);
export const Edit = withPhosphorDefaults(PhPencil);
export const Edit2 = withPhosphorDefaults(PhPencil);
export const Edit3 = withPhosphorDefaults(PhPencil);
export const Expand = withPhosphorDefaults(PhExpand);
export const Film = withPhosphorDefaults(PhFilm);
export const ExternalLink = withPhosphorDefaults(PhLink);
export const Eye = withPhosphorDefaults(PhEye);
export const EyeOff = withPhosphorDefaults(PhEyeOff);
export const File = withPhosphorDefaults(PhFile);
export const FileDown = withPhosphorDefaults(PhFileDown);
export const FileText = withPhosphorDefaults(PhFileText);
export const Filter = withPhosphorDefaults(PhFilter);
export const Flag = withPhosphorDefaults(PhFlag);
export const Flame = withPhosphorDefaults(PhFlame);
export const Gamepad2 = withPhosphorDefaults(PhGamepad2);
export const Gauge = withPhosphorDefaults(PhGauge);
export const Gift = withPhosphorDefaults(PhGift);
export const Globe = withPhosphorDefaults(PhGlobe);
export const GraduationCap = withPhosphorDefaults(PhGraduationCap);
export const Grid3X3 = withPhosphorDefaults(PhGrid3X3);
export const Heart = withPhosphorDefaults(PhHeart);
export const HelpCircle = withPhosphorDefaults(PhHelpCircle);
export const History = withPhosphorDefaults(PhHistory);
export const Home = withPhosphorDefaults(PhHome);
export const Image = withPhosphorDefaults(PhImage);
export const Info = withPhosphorDefaults(PhInfo);
export const Keyboard = withPhosphorDefaults(PhKeyboard);
export const Laptop = withPhosphorDefaults(PhLaptop);
export const LayoutList = withPhosphorDefaults(PhLayoutList);
export const Leaf = withPhosphorDefaults(PhLeaf);
export const Lightbulb = withPhosphorDefaults(PhLightbulb);
export const LineChart = withTablerDefaults(IconChartLine);
export const Link = withPhosphorDefaults(PhLink);
export const List = withPhosphorDefaults(PhList);
export const ListTodo = withPhosphorDefaults(PhListTodo);
export const Loader2 = withPhosphorDefaults(PhLoader2);
export const LogOut = withPhosphorDefaults(PhLogOut);
export const Lock = withPhosphorDefaults(PhLock);
export const Mail = withPhosphorDefaults(PhMail);
// biome-ignore lint/suspicious/noShadowRestrictedNames: Lucide `Map` icon name (compat layer)
export const Map = withPhosphorDefaults(PhMap);
export const MapPin = withPhosphorDefaults(PhMapPin);
export const Medal = withPhosphorDefaults(PhMedal);
export const Menu = withPhosphorDefaults(PhList);
export const MessageCircle = withTablerDefaults(IconMessageCircle);
export const MessageSquare = withTablerDefaults(IconMessage);
export const Mic = withPhosphorDefaults(PhMic);
export const MicOff = withPhosphorDefaults(PhMicOff);
export const Monitor = withPhosphorDefaults(PhMonitor);
export const Moon = withPhosphorDefaults(PhMoon);
export const MoreHorizontal = withPhosphorDefaults(PhMoreHorizontal);
export const MoreVertical = withPhosphorDefaults(PhMoreVertical);
export const Music = withPhosphorDefaults(PhMusic);
export const Package = withPhosphorDefaults(PhPackage);
export const Palette = withTablerDefaults(IconPalette);
export const Paperclip = withPhosphorDefaults(PhPaperclip);
export const Pause = withPhosphorDefaults(PhPause);
export const Pencil = withPhosphorDefaults(PhPencil);
export const PieChart = withPhosphorDefaults(PhPieChart);
export const Pizza = withPhosphorDefaults(PhPizza);
export const Play = withPhosphorDefaults(PhPlay);
export const Plus = withPhosphorDefaults(PhPlus);
export const PlusCircle = withPhosphorDefaults(PhPlusCircle);
export const Presentation = withPhosphorDefaults(PhPresentation);
export const RefreshCw = withPhosphorDefaults(PhRefreshCw);
export const Repeat = withPhosphorDefaults(PhRepeat);
export const Repeat2 = withPhosphorDefaults(PhRepeat2);
export const Reply = withPhosphorDefaults(PhReply);
export const Rocket = withPhosphorDefaults(PhRocket);
export const RotateCcw = withPhosphorDefaults(PhRotateCcw);
export const Rss = withPhosphorDefaults(PhRss);
export const Save = withPhosphorDefaults(PhSave);
export const Search = withPhosphorDefaults(PhSearch);
export const Send = withPhosphorDefaults(PhSend);
export const Settings = withPhosphorDefaults(PhSettings);
export const Share = withPhosphorDefaults(PhShare);
export const Share2 = withTablerDefaults(IconShare2);
export const Shield = withPhosphorDefaults(PhShield);
export const ShoppingCart = withTablerDefaults(IconShoppingCart);
export const SkipForward = withPhosphorDefaults(PhSkipForward);
export const Smartphone = withPhosphorDefaults(PhSmartphone);
export const Smile = withPhosphorDefaults(PhSmile);
export const SortAsc = withPhosphorDefaults(PhSortAsc);
export const Sparkles = withHugeIcon(SparklesIcon);
export const Square = withTablerDefaults(IconSquare);
export const Star = withPhosphorDefaults(PhStar);
export const SunMedium = withPhosphorDefaults(PhSun);
export const Table = withPhosphorDefaults(PhTable);
export const Tag = withPhosphorDefaults(PhTag);
export const Target = withPhosphorDefaults(PhTarget);
export const TestTube = withPhosphorDefaults(PhTestTube);
export const ThumbsDown = withPhosphorDefaults(PhThumbsDown);
export const ThumbsUp = withPhosphorDefaults(PhThumbsUp);
export const Timer = withPhosphorDefaults(PhTimer);
export const Trash = withPhosphorDefaults(PhTrash);
export const Trash2 = withPhosphorDefaults(PhTrash);
export const TrendingDown = withHeroOutline(ArrowTrendingDownIcon);
export const TrendingUp = withHeroOutline(ArrowTrendingUpIcon);
export const TriangleAlert = withPhosphorDefaults(PhAlertTriangle);
export const Trophy = withPhosphorDefaults(PhTrophy);
export const Undo = withPhosphorDefaults(PhUndo);
export const Unlock = withPhosphorDefaults(PhUnlock);
export const Upload = withPhosphorDefaults(PhUpload);
export const User = withPhosphorDefaults(PhUser);
export const UserMinus = withPhosphorDefaults(PhUserMinus);
export const UserPlus = withPhosphorDefaults(PhUserPlus);
export const Users = withPhosphorDefaults(PhUsers);
export const Video = withPhosphorDefaults(PhVideo);
export const Wand2 = withPhosphorDefaults(PhWand2);
export const Volume2 = withPhosphorDefaults(PhVolume2);
export const VolumeX = withTablerDefaults(IconVolumeOff);
export const Wifi = withPhosphorDefaults(PhWifi);
export const WifiOff = withPhosphorDefaults(PhWifiOff);
export const Wind = withPhosphorDefaults(PhWind);
export const X = withPhosphorDefaults(PhX);
export const XCircle = withPhosphorDefaults(PhXCircle);
export const Zap = withPhosphorDefaults(PhZap);

export const Twitter = withTablerDefaults(IconBrandTwitter);
export const Facebook = withTablerDefaults(IconBrandFacebook);
export const Linkedin = withTablerDefaults(IconBrandLinkedin);
export const Whatsapp = withTablerDefaults(IconBrandWhatsapp);

export const Google = ({ ...props }: React.SVGProps<SVGSVGElement>) => (
    <svg
      aria-hidden="true"
      focusable="false"
      data-prefix="fab"
      data-icon="google"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 488 512"
      {...props}
    >
      <path
        fill="currentColor"
        d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
      />
    </svg>
  );

export const Microsoft = ({ ...props }: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 23 23"
      width="18"
      height="18"
      {...props}
    >
      <path fill="#f3f3f3" d="M0 0h23v23H0z" />
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  );

export const GitHub = ({ ...props }: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 438.549 438.549" {...props}>
      <path
        fill="currentColor"
        d="M409.132 114.573c-19.608-33.596-46.205-60.194-79.798-79.8-33.598-19.607-70.277-29.408-110.063-29.408-39.781 0-76.472 9.804-110.063 29.408-33.596 19.605-60.192 46.204-79.8 79.8C9.803 148.168 0 184.854 0 224.63c0 47.78 13.94 90.745 41.827 128.906 27.884 38.164 63.906 64.572 108.063 79.227 5.14.954 8.945.283 11.419-1.996 2.475-2.282 3.711-5.14 3.711-8.562 0-.571-.049-5.708-.144-15.417a2549.81 2549.81 0 01-.144-25.406l-6.567 1.136c-4.187.767-9.469 1.092-15.846 1-6.374-.089-12.991-.757-19.842-1.999-6.854-1.231-13.229-4.086-19.13-8.559-5.898-4.473-10.085-10.328-12.56-17.556l-2.855-6.57c-1.903-4.374-4.899-9.233-8.992-14.559-4.093-5.331-8.232-8.945-12.419-10.848l-1.999-1.431c-1.332-.951-2.568-2.098-3.711-3.429-1.142-1.331-1.997-2.663-2.568-3.997-.572-1.335-.098-2.43 1.427-3.289 1.525-.859 4.281-1.276 8.28-1.276l5.708.853c3.807.763 8.516 3.042 14.133 6.851 5.614 3.806 10.229 8.754 13.846 14.842 4.38 7.806 9.657 13.754 15.846 17.847 6.184 4.093 12.419 6.136 18.699 6.136 6.28 0 11.704-.476 16.274-1.423 4.565-.952 8.848-2.383 12.847-4.285 1.713-12.758 6.377-22.559 13.988-29.41-10.848-1.14-20.601-2.857-29.264-5.14-8.658-2.286-17.605-5.996-26.835-11.14-9.235-5.137-16.896-11.516-22.985-19.126-6.09-7.614-11.088-17.61-14.987-29.979-3.901-12.374-5.852-26.648-5.852-42.826 0-23.035 7.52-42.637 22.557-58.817-7.044-17.318-6.379-36.732 1.997-58.24 5.52-1.715 13.706-.428 24.554 3.853 10.85 4.283 18.794 7.952 23.84 10.994 5.046 3.041 9.089 5.618 12.135 7.708 17.705-4.947 35.976-7.421 54.818-7.421s37.117 2.474 54.823 7.421l10.849-6.849c7.419-4.57 16.18-8.758 26.262-12.565 10.088-3.805 17.802-4.853 23.134-3.138 8.562 21.509 9.325 40.922 2.279 58.24 15.036 16.18 22.559 35.787 22.559 58.817 0 16.178-1.958 30.497-5.853 42.966-3.9 12.471-8.941 22.457-15.125 29.979-6.191 7.521-13.901 13.85-23.131 18.986-9.232 5.14-18.182 8.85-26.84 11.136-8.662 2.286-18.415 4.004-29.263 5.146 9.894 8.562 14.842 22.077 14.842 40.539v60.237c0 3.422 1.19 6.279 3.572 8.562 2.379 2.279 6.136 2.95 11.276 1.995 44.163-14.653 80.185-41.062 108.068-79.226 27.88-38.161 41.825-81.126 41.825-128.906-.01-39.771-9.818-76.454-29.414-110.049z"
      />
    </svg>
  );
