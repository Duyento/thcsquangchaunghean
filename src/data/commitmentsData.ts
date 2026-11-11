export interface PledgeOption {
  id: string;
  category: "Trường học" | "Gia đình" | "Bản thân" | "Cộng đồng";
  text: string;
  description: string;
  icon: string;
}

export interface StudentPledge {
  id: string;
  studentName: string;
  schoolGrade: string;
  className: string;
  timestamp: string;
  selectedPledges: string[];
  personalMessage: string;
  avatarSeed: number;
}

export const PRESET_PLEDGES: PledgeOption[] = [
  {
    id: "p1",
    category: "Trường học",
    text: "Không trêu chọc, giễu cợt ngoại hình hay sở thích của bạn khác giới",
    description: "Tôn trọng vẻ đẹp và cá tính riêng của mỗi người trong lớp học.",
    icon: "ShieldCheck"
  },
  {
    id: "p2",
    category: "Trường học",
    text: "Tích cực hợp tác bình đẳng trong mọi hoạt động nhóm và lao động vệ sinh",
    description: "Cùng làm việc, cùng gánh vác, không phân biệt 'việc nặng' hay 'việc nhẹ'.",
    icon: "Users"
  },
  {
    id: "p3",
    category: "Trường học",
    text: "Dũng cảm lên tiếng khi thấy bạn bè bị bắt nạt hoặc chịu định kiến giới",
    description: "Lên tiếng ôn hòa hoặc thông báo ngay cho thầy cô, bảo vệ bạn bè.",
    icon: "Megaphone"
  },
  {
    id: "p4",
    category: "Gia đình",
    text: "Chủ động vào bếp và cùng cha mẹ chia sẻ việc nhà mỗi ngày",
    description: "Nấu cơm, rửa bát, quét dọn nhà cửa là kỹ năng tự lập của chính mình.",
    icon: "Home"
  },
  {
    id: "p5",
    category: "Gia đình",
    text: "Tôn trọng tiếng nói và nguyện vọng của anh, chị, em trong gia đình",
    description: "Lắng nghe, không áp đặt, cùng nhau tạo nên bầu không khí ấm áp, dân chủ.",
    icon: "Heart"
  },
  {
    id: "p6",
    category: "Bản thân",
    text: "Tự tin theo đuổi ước mơ nghề nghiệp và sở thích mà mình yêu thích",
    description: "Không để định kiến 'nghề của con trai' hay 'nghề của con gái' ngăn bước.",
    icon: "Sparkles"
  },
  {
    id: "p7",
    category: "Bản thân",
    text: "Học cách biểu đạt cảm xúc lành mạnh và biết đồng cảm với người khác",
    description: "Con trai được khóc, con gái được mạnh mẽ - trân trọng cảm xúc của bản thân.",
    icon: "Smile"
  },
  {
    id: "p8",
    category: "Cộng đồng",
    text: "Lan tỏa thông điệp bình đẳng giới trên mạng xã hội văn minh, tích cực",
    description: "Chia sẻ bài viết hay, không like hay bình luận miệt thị ác ý trên mạng.",
    icon: "Share2"
  }
];

export const INITIAL_STUDENT_PLEDGES: StudentPledge[] = [
  {
    id: "pledge-1",
    studentName: "Nguyễn Nhật Minh",
    schoolGrade: "Lớp 8",
    className: "8A",
    timestamp: "Hôm nay, 08:30",
    selectedPledges: [
      "Chủ động vào bếp và cùng cha mẹ chia sẻ việc nhà mỗi ngày",
      "Không trêu chọc, giễu cợt ngoại hình hay sở thích của bạn khác giới"
    ],
    personalMessage: "Mình cam kết từ hôm nay sẽ tự giác rửa bát và nấu cơm phụ mẹ mỗi chiều tan học!",
    avatarSeed: 1
  },
  {
    id: "pledge-2",
    studentName: "Trần Bảo Ngọc",
    schoolGrade: "Lớp 9",
    className: "9B",
    timestamp: "Hôm nay, 09:15",
    selectedPledges: [
      "Tự tin theo đuổi ước mơ nghề nghiệp và sở thích mà mình yêu thích",
      "Tích cực hợp tác bình đẳng trong mọi hoạt động nhóm và lao động vệ sinh"
    ],
    personalMessage: "Ước mơ của mình là trở thành lập trình viên trí tuệ nhân tạo. Mình sẽ không bao giờ bỏ cuộc!",
    avatarSeed: 2
  },
  {
    id: "pledge-3",
    studentName: "Lê Hoàng Phúc",
    schoolGrade: "Lớp 7",
    className: "7C",
    timestamp: "Hôm qua, 16:45",
    selectedPledges: [
      "Dũng cảm lên tiếng khi thấy bạn bè bị bắt nạt hoặc chịu định kiến giới",
      "Học cách biểu đạt cảm xúc lành mạnh và biết đồng cảm với người khác"
    ],
    personalMessage: "Con trai khóc khi buồn không hề yếu đuối. Mình cam kết luôn là người bạn biết lắng nghe.",
    avatarSeed: 3
  },
  {
    id: "pledge-4",
    studentName: "Phạm Thùy Chi",
    schoolGrade: "Lớp 6",
    className: "6A",
    timestamp: "Hôm qua, 14:20",
    selectedPledges: [
      "Lan tỏa thông điệp bình đẳng giới trên mạng xã hội văn minh, tích cực",
      "Tôn trọng tiếng nói và nguyện vọng của anh, chị, em trong gia đình"
    ],
    personalMessage: "Em muốn ngôi trường THCS Quảng Châu sẽ luôn tràn ngập tiếng cười và sự tôn trọng lẫn nhau!",
    avatarSeed: 4
  }
];
