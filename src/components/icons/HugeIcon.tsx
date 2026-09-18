import React from 'react';
import {
  Search,
  Filter,
  SlidersHorizontal,
  User,
  Users,
  MessageSquare,
  MessageCircle,
  Clock,
  Building2,
  Tag,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Sparkles,
  Trash2,
  Send,
  Target,
  Radio,
  LayoutDashboard,
  Settings,
  BarChart2,
  MoreHorizontal,
  Share2,
  MapPin,
  Calendar,
  Layers,
  Bell,
  Phone,
  Star,
  Paperclip,
  Mic,
  Smile,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCheck,
  FileText,
  File,
  Image as ImageIcon,
  Bold,
  Italic,
  List,
  Zap,
  Columns,
  Square,
  Package,
  RefreshCw,
  Copy,
  ExternalLink,
  ShieldCheck,
  Shield,
  Smartphone,
  HelpCircle,
  PlayCircle,
  Pencil,
  QrCode,
  Link as LinkIcon,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
  Loader2,
  ZoomIn,
  Sticker,
  LucideIcon,
  LucideProps,
} from 'lucide-react';

// Export aliases mapped strictly to Lucide icons
export const Search01Icon = Search;
export const FilterIcon = Filter;
export const FilterHorizontalIcon = SlidersHorizontal;
export const UserIcon = User;
export const UserMultipleIcon = Users;
export const UserGroupIcon = Users;
export const Message01Icon = MessageSquare;
export const Message02Icon = MessageCircle;
export const Clock01Icon = Clock;
export const Building01Icon = Building2;
export const Tag01Icon = Tag;
export const ArrowRight01Icon = ArrowRight;
export const ArrowLeft01Icon = ArrowLeft;
export const Cancel01Icon = X;
export const CheckmarkCircle01Icon = CheckCircle2;
export const SparklesIcon = Sparkles;
export const Delete01Icon = Trash2;
export const SentIcon = Send;
export const WhatsappIcon = MessageCircle;
export const Target02Icon = Target;
export const RadarIcon = Radio;
export const DashboardSquare01Icon = LayoutDashboard;
export const Settings01Icon = Settings;
export const ChartBarLineIcon = BarChart2;
export const MoreHorizontalIcon = MoreHorizontal;
export const Share01Icon = Share2;
export const Location01Icon = MapPin;
export const Calendar01Icon = Calendar;
export const Layers01Icon = Layers;
export const Notification01Icon = Bell;
export const TelephoneIcon = Phone;
export const StarIcon = Star;
export const AttachmentIcon = Paperclip;
export const MicIcon = Mic;
export const EmojiIcon = Smile;
export const PlusIcon = Plus;
export const ChevronDownIcon = ChevronDown;
export const ChevronLeftIcon = ChevronLeft;
export const ChevronRightIcon = ChevronRight;
export const CheckIcon = Check;
export const DoubleCheckIcon = CheckCheck;
export const DocumentIcon = FileText;
export const FileIcon = File;
export const ImageIconRef = ImageIcon;
export const BoldIcon = Bold;
export const ItalicIcon = Italic;
export const ListIcon = List;
export const LightningIcon = Zap;
export const KanbanIcon = Columns;
export const SquareIcon = Square;
export const PackageIcon = Package;
export const RefreshIcon = RefreshCw;
export const Copy01Icon = Copy;
export const ExternalLinkIcon = ExternalLink;
export const ShieldCheckIcon = ShieldCheck;
export const ShieldIcon = Shield;
export const SmartPhoneIcon = Smartphone;
export const HelpCircleIcon = HelpCircle;
export const VideoIcon = PlayCircle;
export const Edit01Icon = Pencil;
export const QrCodeIcon = QrCode;
export const Link01Icon = LinkIcon;
export const PlayIcon = Play;
export const PauseIcon = Pause;
export const VolumeIcon = Volume2;
export const VolumeMuteIcon = VolumeX;
export const MaximizeIcon = Maximize2;
export const DownloadIcon = Download;
export const LoaderIcon = Loader2;
export const ZoomInIcon = ZoomIn;
export const StickerIcon = Sticker;

export interface HugeIconProps extends Omit<LucideProps, 'ref'> {
  icon: LucideIcon | React.ComponentType<LucideProps>;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const HugeIcon: React.FC<HugeIconProps> = ({
  icon: IconComponent,
  size = 18,
  strokeWidth = 1.8,
  className = '',
  ...rest
}) => {
  if (!IconComponent) return null;
  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...rest}
    />
  );
};
