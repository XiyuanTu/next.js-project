import { useState, useEffect, useRef, useCallback } from "react";
import { styled } from "@mui/material/styles";
import ReactMarkdown from "react-markdown";
import { CodeProps } from "react-markdown/lib/ast-to-react";
import remarkGfm from "remark-gfm";
import "github-markdown-css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { SvgIconComponent } from "@mui/icons-material";
import {
  Button,
  Tooltip,
  Card,
  CardHeader,
  CardMedia,
  CardContent,
  CardActions,
  Avatar,
  IconButton,
  Typography,
  TextField,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListItemAvatar,
  Collapse,
  Divider,
} from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { IconButtonProps } from "@mui/material/IconButton";
import { red } from "@mui/material/colors";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import FavoriteIcon from "@mui/icons-material/Favorite";
import BookmarkBorderOutlinedIcon from "@mui/icons-material/BookmarkBorderOutlined";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import ShareIcon from "@mui/icons-material/Share";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import axios from "axios";
import { feedback } from "../../../utils/feedback";
import { useAppDispatch } from "../../../state/hooks";
import { Action, Feedback, NoteInfo, UserInfo } from "../../../types/constants";
import UserAvatar from "../../UserAvatar";
import {
  convertCount,
  convertDate,
} from "../../../utils/forum";
import Comment from "./Comment/";
import { useSession } from "next-auth/react";

interface ExpandMoreProps extends IconButtonProps {
  expand: boolean;
}

const ExpandMore = styled((props: ExpandMoreProps) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  transform: !expand ? "rotate(0deg)" : "rotate(180deg)",
  marginLeft: "auto",
  transition: theme.transitions.create("transform", {
    duration: theme.transitions.duration.shortest,
  }),
}));

interface IProps {
  note: ForumNote;
  user: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
}

const ContentItem = ({ note, user, setCurrentUser }: IProps) => {
  const {
    _id: noteId,
    mdText,
    title,
    createdAt,
    lastModified,
    firstPublicAt,
    tags,
    like,
    bookmark,
    comment,
    comments,
    author: {
      _id: authorId,
      username: authorName,
      description: authorDescription,
      avatar: authorAvatar,
    },
  } = note;

  const {
    _id: userId,
    username: username,
    description: userDescription,
    avatar: userAvatar,
    following,
    likes,
    bookmarks,
  } = user;

  const { data: session, status } = useSession();
  const [isFollowing, setIsFollowing] = useState(following.includes(authorId));
  const [isLike, setIsLike] = useState(likes.includes(noteId));
  const [likeCount, setLikeCount] = useState(like);
  const [isBookmark, setIsBookmark] = useState(bookmarks.includes(noteId));
  const [bookmarkCount, setBookmarkCount] = useState(bookmark);
  const [commentIds, setCommentIds] = useState(comments);
  const [noteComments, setNoteComments] = useState<ConvertedComment[]>([]);

  // When a new comment is added, it will still be able to display comments correctly number-wise. 
  const [newNoteComments, setNewNoteComments] = useState<ConvertedComment[]>(
    []
  );
  const [commentRenderCount, setCommentRenderCount] = useState(5);
  const [commentContent, setCommentContent] = useState("");
  const [commentCount, setCommentCount] = useState(comment);
  const [openComment, setOpenComment] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const commentSectionRef = useRef<HTMLDivElement>(null)
  const dispatch = useAppDispatch();

  const handleGetComment = useCallback(async () => {
    if (!openComment) {
      const {
        data: { convertedComments },
      } = await axios.get("http://localhost:3000/api/comment", {
        params: { commentIds },
      });
      setNoteComments(convertedComments);
      setNewNoteComments([])
      console.log(convertedComments);
    }
    setOpenComment((state) => !state);
  }, [openComment, commentIds]);

  const handleFollow = useCallback(async () => {
    let newFollowing;
    newFollowing = isFollowing
      ? following.filter((id) => id !== authorId)
      : [...following, authorId];
    try {
      await axios.patch(`http://localhost:3000/api/user/${userId}`, {
        action: isFollowing ? Action.Pull : Action.Push,
        value: { following: authorId },
      });
      setCurrentUser({ ...user, following: newFollowing });
    } catch (e) {
      feedback(
        dispatch,
        Feedback.Error,
        "Fail to delete. Internal error. Please try later."
      );
    }
  }, [isFollowing, following]);

  const handleLike = useCallback(async () => {
    try {
      await axios.patch(`http://localhost:3000/api/user/${userId}`, {
        action: isLike ? Action.Pull : Action.Push,
        value: { likes: noteId },
      });
      await axios.patch(`http://localhost:3000/api/note/${noteId}`, {
        property: NoteInfo.Like,
        value: isLike ? -1 : 1,
      });

      setLikeCount((state) => (isLike ? state - 1 : state + 1));
      setIsLike((state) => !state);
    } catch (e) {
      feedback(
        dispatch,
        Feedback.Error,
        "Fail to delete. Internal error. Please try later."
      );
    }
  }, [isLike]);

  const handleBookmark = useCallback(async () => {
    try {
      await axios.patch(`http://localhost:3000/api/user/${userId}`, {
        action: isBookmark ? Action.Pull : Action.Push,
        value: { bookmarks: noteId },
      });
      await axios.patch(`http://localhost:3000/api/note/${noteId}`, {
        property: NoteInfo.Bookmark,
        value: isBookmark ? -1 : 1,
      });

      setBookmarkCount((state) => (isBookmark ? state - 1 : state + 1));
      setIsBookmark((state) => !state);
    } catch (e) {
      feedback(
        dispatch,
        Feedback.Error,
        "Fail to delete. Internal error. Please try later."
      );
    }
  }, [isBookmark]);

  const handleExpandClick = useCallback(() => {
    setExpanded((state) => !state);
  }, []);

  const handleCommentContentOnChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setCommentContent(e.target.value);
    },
    []
  );

  const handleAddComment = useCallback(async () => {
    try {
      const {
        data: { returnValue },
      } = await axios.post("http://localhost:3000/api/comment", {
        userId,
        content: commentContent.trim(),
        noteId,
      });
      setCommentContent("");
      delete returnValue["__v"];
      setNewNoteComments((state) => [returnValue, ...state]);
      setCommentIds((state) => [returnValue._id, ...state]);
      setCommentCount(state => state + 1)
    } catch (e) {
      feedback(
        dispatch,
        Feedback.Error,
        "Fail to add comment. Internal error. Please try later."
      );
    }
  }, [noteId, userId, commentContent]);

  const handleShowMore = useCallback(() => {
    setCommentRenderCount((state) => state + 5);
  }, []);

  useEffect(() => {
    setIsFollowing(following.includes(authorId));
  }, [following]);

  // When the comment section is open, if it's not in the screen, it will be scrolled to the middle of the screen
  useEffect(() => {
    if (openComment) {
      const {top} = commentSectionRef.current!.getBoundingClientRect()
      const offsetTop = commentSectionRef.current!.offsetTop
      if (top > window.innerHeight) {
        window.scrollTo({top: offsetTop - window.innerHeight / 2, behavior: 'smooth'});
      }
    }
  }, [openComment])

  const actionList = [
    {
      label: "Comment",
      info: convertCount(commentCount),
      icon: ChatBubbleOutlineIcon,
      onClick: handleGetComment,
    },
    {
      label: "Like",
      info: convertCount(likeCount),
      icon: isLike ? FavoriteIcon : FavoriteBorderIcon,
      onClick: handleLike,
      state: isLike,
    },
    {
      label: "Bookmark",
      info: convertCount(bookmarkCount),
      icon: isBookmark ? BookmarkIcon : BookmarkBorderOutlinedIcon,
      onClick: handleBookmark,
      state: isBookmark,
    },
  ];

  if (!session) {
    return <></>;
  }

  return (
    <Card
      sx={{ boxShadow: "none", mb: 1, bgcolor: "#fff", overflow: "visible" }}
    >
      {/* author info */}
      <CardHeader
        avatar={<UserAvatar image={authorAvatar} name={authorName} />}
        action={
          <IconButton aria-label="settings">
            <MoreVertIcon />
          </IconButton>
        }
        title={
          <Typography
            variant="body2"
            sx={{ fontWeight: "bold", fontFamily: "inherit" }}
            component="span"
          >
            {authorName} ·&nbsp;
            <Typography
              variant="body2"
              sx={{
                fontFamily: "inherit",
                color: isFollowing ? "#939598" : "#2e69ff",
                "&:hover": { cursor: "pointer", textDecoration: "underline" },
              }}
              onClick={handleFollow}
              component="span"
            >
              {isFollowing ? "Following" : "Follow"}
            </Typography>
          </Typography>
        }
        subheader={
          <Typography
            variant="body2"
            sx={{ fontFamily: "inherit", color: "gray" }}
          >
            {authorDescription} · {convertDate(firstPublicAt)}
          </Typography>
        }
        sx={{
          pb: 0,
          "& .MuiCardHeader-title": {
            fontWeight: "bold",
            fontFamily: "inherit",
          },
        }}
      />

      {/* note title  */}
      <CardContent sx={{ pb: 0 }}>
        <Typography
          variant="body1"
          sx={{ fontWeight: "bold", fontFamily: "inherit" }}
        >
          {title}
        </Typography>
      </CardContent>

      {/* tags  */}
      {tags.length > 0 && (
        <CardContent sx={{ pt: 0.5, pb: 0 }}>
          {tags.map((tag) => (
            <Button
              key={tag}
              sx={{
                py: 0,
                px: 1,
                mr: 1,
                minWidth: "auto",
                maxWidth: "100%",
                color: "#39739d",
                backgroundColor: "#e1ecf4",
                border: "none",
                textTransform: "none",
                ":hover": { backgroundColor: "#d0e3f1", border: "none" },
              }}
              variant="outlined"
            >
              <Typography
                noWrap={true}
                sx={{ fontSize: 12, fontFamily: "inherit" }}
              >
                {tag}
              </Typography>
            </Button>
          ))}
        </CardContent>
      )}

      {/* note content  */}
      <CardContent
        sx={{ maxHeight: expanded ? "none" : 200, overflowY: "hidden" }}
      >
        <ReactMarkdown
          skipHtml={true}
          className="markdown-body"
          components={{
            code({
              node,
              inline,
              className,
              children,
              style,
              ...props
            }: CodeProps) {
              const match = /language-(\w+)/.exec(className || "");
              return !inline && match ? (
                <SyntaxHighlighter
                  children={String(children).replace(/\n$/, "")}
                  wrapLongLines={true}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                />
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
          remarkPlugins={[remarkGfm]}
        >
          {mdText}
        </ReactMarkdown>
      </CardContent>
      
      {/* comment section button, like button, bookmark button and expand button  */}
      <CardActions
        sx={{
          bgcolor: "#fff",
          position: expanded ? "sticky" : "static",
          bottom: 0,
        }}
        disableSpacing
      >
        {actionList.map((action, index) => (
          <ActionButton key={index} action={action} />
        ))}

        <ExpandMore
          expand={expanded}
          onClick={handleExpandClick}
          aria-expanded={expanded}
          aria-label="show more"
        >
          <ExpandMoreIcon />
        </ExpandMore>
      </CardActions>

      {/* comment section */}
      {openComment && (
        <Box >
          <CardContent ref={commentSectionRef}>
            <Grid container spacing={1}>
              <Grid xs={11}>
                <TextField
                  multiline
                  minRows={3}
                  fullWidth
                  placeholder="Add a comment..."
                  sx={{ height: "100%" }}
                  value={commentContent}
                  onChange={handleCommentContentOnChange}
                />
              </Grid>
              <Grid
                xs={1}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Box sx={{ pt: 1, mb: 1 }}>
                  <UserAvatar image={userAvatar} name={username} />
                </Box>
                <Button
                  disabled={commentContent.trim() === ""}
                  variant="contained"
                  sx={{
                    width: "50%",
                    fontFamily: "inherit",
                    fontSize: 12,
                    textTransform: "none",
                  }}
                  onClick={handleAddComment}
                >
                  Comment
                </Button>
              </Grid>
            </Grid>
          </CardContent>
          <CardContent sx={{ "&.MuiCardContent-root": { pt: 0, pb: 2 } }}>
            <List disablePadding={true}>
              {newNoteComments!.map((noteComment) => {
                return (
                  <Comment
                    comment={noteComment}
                    noteAuthorId={authorId}
                    user={user}
                    noteId={noteId}
                    setCommentCount={setCommentCount}
                    key={noteComment._id}
                  />
                );
              })}
              {noteComments!.map((noteComment, index) => {
                if (index < commentRenderCount) {
                  return (
                    <Comment
                      comment={noteComment}
                      noteAuthorId={authorId}
                      user={user}
                      noteId={noteId}
                      setCommentCount={setCommentCount}
                      key={noteComment._id}
                    />
                  );
                }
              })}
            </List>
            {noteComments.length - commentRenderCount > 0 && (
              <Button
                onClick={handleShowMore}
                variant="outlined"
                sx={{
                  width: "100%",
                  borderRadius: "50px",
                  backgroundColor: "#00000008",
                  borderColor: "#0000001f",
                  textTransform: "none",
                  fontFamily: "inherit",
                  fontSize: 14,
                  color: "#636466",
                  "&:hover": {
                    backgroundColor: "#ececee",
                    borderColor: "#0000001f",
                  },
                }}
              >
                View more comments <ArrowDropDownIcon />
              </Button>
            )}
          </CardContent>
        </Box>
      )}
    </Card>
  );
};

export default ContentItem;

interface ActionButtonIProps {
  action: {
    label: string;
    icon: SvgIconComponent;
    info?: string;
    onClick: () => void;
    state?: boolean;
  };
}

const ActionButton = ({ action }: ActionButtonIProps) => {
  const { label, icon: Icon, info, onClick, state } = action;
  return (
    <Tooltip title={label} arrow placement="top">
      <IconButton
        aria-label={label}
        size="small"
        sx={{ borderRadius: "20%", color: state ? "#007fff" : "" }}
        onClick={onClick}
      >
        <Icon sx={{ fontSize: 20, mr: 1 }} />
        <Typography sx={{ fontFamily: "inherit" }}>{info}</Typography>
      </IconButton>
    </Tooltip>
  );
};
